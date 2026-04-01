
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { Message, AdStrategy } from './types';
import StrategyDisplay from './components/StrategyDisplay';
import CreativeStudio from './components/CreativeStudio';
import SiteAuditor from './components/SiteAuditor';
import ViralPulse from './components/ViralPulse';
import LiveCoach from './components/LiveCoach';
import LoadingScreen from './components/LoadingScreen';

import { AuthProvider, useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, token, logout, refresh, fetchWithAuth, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [strategyProfile, setStrategyProfile] = useState<any>(null);
  const [nextStep, setNextStep] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [service, setService] = useState<GeminiService | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [finalStrategy, setFinalStrategy] = useState<AdStrategy | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'studio' | 'auditor' | 'pulse' | 'coach' | 'admin'>('chat');
  const [hasUserKey, setHasUserKey] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token && user) {
      const fetchConversations = async () => {
        try {
          const res = await fetchWithAuth('/api/chat/conversations');
          if (res.ok) {
            const data = await res.json();
            setConversations(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error("Auth error:", err);
        }
      };
      fetchConversations();
    }
  }, [token, user, logout, fetchWithAuth]);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      setHasUserKey(!!hasKey);
    };
    checkKey();
    const interval = setInterval(checkKey, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading, currentView]);

  if (authLoading || isInitialLoading) return <LoadingScreen message="Initializing Neural Link..." />;
  if (!user) return <Auth />;

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
    setErrorMessage(null);
  };

  const handleStart = async (conversationId?: number) => {
    setIsInitializing(true);
    setErrorMessage(null);
    const newService = new GeminiService();
    
    // Minimum 2s delay for animation
    const delay = new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await delay;
      // Load or create strategy profile
      const profRes = await fetchWithAuth('/api/strategy/profile');
      if (!profRes.ok) return;
      const { profile, nextStep: step } = await profRes.json();
      setStrategyProfile(profile);
      setNextStep(step);

      if (profile.status === 'generated' && profile.generated_strategy) {
        setFinalStrategy(JSON.parse(profile.generated_strategy));
        setIsSessionStarted(true);
      } else if (conversationId || profile.conversation_id) {
        const targetId = conversationId || profile.conversation_id;
        const res = await fetchWithAuth(`/api/chat/conversations/${targetId}`);
        const data = await res.json();
        
        const history = data.messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));
        
        newService.setConversationId(targetId);
        newService.setHistory(history);
        
        setMessages(data.messages.map((m: any) => ({ role: m.role, text: m.content })));
        
        // If no messages yet, start with the first question
        if (data.messages.length === 0 && step) {
          setMessages([{ role: 'model', text: step.question }]);
        }
        
        setActiveConversationId(targetId);
        setIsSessionStarted(true);
      }
      setService(newService);
    } catch (error: any) {
      setErrorMessage("Initialization failed.");
    } finally {
      setIsInitializing(false);
    }
  };

  const deleteConversation = async (id: number) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await fetchWithAuth(`/api/chat/conversations/${id}`, {
        method: 'DELETE'
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setIsSessionStarted(false);
        setMessages([]);
        setActiveConversationId(null);
      }
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading || !service) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInputValue('');
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      if (strategyProfile && strategyProfile.status === 'collecting') {
        const res = await fetchWithAuth('/api/strategy/answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ profileId: strategyProfile.id, answer: text })
        });
        if (!res.ok) return;
        const data = await res.json();
        setStrategyProfile(data.profile);
        setNextStep(data.nextStep);
        
        if (data.profile.status === 'ready') {
          setMessages(prev => [...prev, { role: 'model', text: "Profile complete. Synthesis engine ready. Triggering generation..." }]);
          handleSynthesize(data.profile);
        } else if (data.nextStep) {
          setMessages(prev => [...prev, { role: 'model', text: data.nextStep.question }]);
        }
      } else {
        // Save user message
        const userMsgRes = await fetchWithAuth('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ conversationId: activeConversationId, role: 'user', content: text })
        });
        if (!userMsgRes.ok) return;

        const responseText = await service.sendMessage(text);
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        
        // Save assistant message
        const assistantMsgRes = await fetchWithAuth('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ conversationId: activeConversationId, role: 'assistant', content: responseText })
        });
        if (!assistantMsgRes.ok) return;
      }
    } catch (error: any) {
      setErrorMessage("Network heartbeat lost. Retrying...");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSynthesize = async (profile: any) => {
    if (!service) return;
    setIsLoading(true);
    try {
      const strategyJson = await service.generateStrategyFromProfile(profile);
      
      // Save to profile
      const saveRes = await fetchWithAuth('/api/strategy/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profileId: profile.id, strategy: strategyJson })
      });
      if (!saveRes.ok) return;
      
      const strategy = JSON.parse(strategyJson);
      setFinalStrategy(strategy);
      
      // Refresh profile
      const profRes = await fetchWithAuth('/api/strategy/profile');
      if (!profRes.ok) return;
      const { profile: updatedProfile } = await profRes.json();
      setStrategyProfile(updatedProfile);
    } catch (e) {
      setErrorMessage("Synthesis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStrategyView = () => {
    if (finalStrategy) {
      return <StrategyDisplay strategy={finalStrategy} onReset={() => setFinalStrategy(null)} />;
    }

    if (!isSessionStarted) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative w-full">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
          <div className="relative z-10 max-w-2xl animate-fade">
            <span className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-8 inline-block">Enterprise Growth Node</span>
            <h1 className="text-6xl md:text-9xl font-black text-slate-900 tracking-tighter mb-10 leading-[0.85]">
              SCALE<br/><span className="text-indigo-600">FASTER.</span>
            </h1>
            <p className="text-slate-400 text-lg mb-14 font-medium max-w-lg mx-auto leading-relaxed italic">"The difference between profit and noise is data-backed creative intelligence."</p>
            <button onClick={() => handleStart()} disabled={isLoading} className="px-12 md:px-16 py-5 md:py-7 bg-black text-white rounded-full font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl transition-all hover:scale-105 active:scale-95 group">
              {isLoading ? <i className="fa-solid fa-circle-notch fa-spin mr-3"></i> : <i className="fa-solid fa-chevron-right mr-3 group-hover:translate-x-1 transition-transform"></i>}
              {isLoading ? 'Infiltrating...' : 'Enter Strategy Hub'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden w-full h-full">
        {/* Progress Header for Strategy Hub */}
        {strategyProfile && strategyProfile.status === 'collecting' && (
          <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 max-w-2xl">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${strategyProfile.completion_score}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-black text-slate-900">{strategyProfile.completion_score}% Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100">Discovery Phase</span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden max-w-5xl mx-auto w-full h-full">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 pr-4 scroll-hide pb-24 pt-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade`}>
                <div className={`max-w-[85%] md:max-w-[75%] px-6 py-5 rounded-[2rem] ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                }`}>
                  <p className="text-sm md:text-base font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-200 flex gap-2 shadow-sm">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="mt-auto relative max-w-3xl mx-auto w-full">
            <div className="absolute -top-12 left-0 right-0 flex justify-center">
               {strategyProfile?.status === 'ready' && (
                 <button 
                   onClick={() => handleSynthesize(strategyProfile)}
                   className="px-6 py-2 bg-emerald-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all animate-bounce"
                 >
                   <i className="fa-solid fa-bolt mr-2"></i> Trigger Synthesis
                 </button>
               )}
            </div>
            <div className="p-2 bg-white border border-slate-200 rounded-[2rem] shadow-2xl flex items-center pr-2 overflow-hidden focus-within:border-indigo-400 transition-all">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="flex-1 flex items-center">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder={nextStep ? `Answer: ${nextStep.question}` : "Type your message..."} 
                  className="flex-1 bg-white px-6 py-4 focus:outline-none font-bold text-slate-800 text-sm" 
                  disabled={isLoading} 
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !inputValue.trim()} 
                  className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-10 shadow-lg flex-shrink-0"
                >
                  <i className="fa-solid fa-arrow-up text-sm"></i>
                </button>
              </form>
            </div>
            <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shift + Enter for new line • AdStrat Intelligence v4.0</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50/30 text-slate-900 overflow-hidden font-sans">
      {isInitializing && <LoadingScreen message="Infiltrating Neural Core..." />}
      {/* Sidebar Navigation */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col hidden lg:flex shadow-2xl shadow-slate-200/50 z-50">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200 rotate-3 hover:rotate-0 transition-transform duration-500">
              <i className="fa-solid fa-chess-knight text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">AdStrat <span className="text-indigo-600">PRO</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Neural Command</p>
            </div>
          </div>
          
          <button 
            onClick={() => { setIsSessionStarted(false); setMessages([]); setActiveConversationId(null); setCurrentView('chat'); }}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200 active:scale-95"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            New Strategy Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-hide">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 mb-4 block opacity-50">Recent Intelligence</label>
            <div className="space-y-2">
              {conversations.map(c => (
                <div 
                  key={c.id} 
                  className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${activeConversationId === c.id ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  onClick={() => { handleStart(c.id); setCurrentView('chat'); }}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${activeConversationId === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       <i className="fa-solid fa-message text-[10px]"></i>
                    </div>
                    <span className="text-xs font-black truncate tracking-tight">{c.title}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:text-rose-500 transition-all"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                   <i className="fa-solid fa-ghost text-slate-100 text-4xl mb-4"></i>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active links</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{user?.email}</p>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest mt-0.5">Terminate Session</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 flex flex-col md:flex-row items-center px-4 md:px-10 py-4 md:py-0 md:h-24 justify-between sticky top-0 z-40">
          <div className="flex items-center justify-between w-full md:w-auto gap-12 lg:hidden mb-4 md:mb-0">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentView('chat')}>
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-200">
                <i className="fa-solid fa-chess-knight text-white text-xl"></i>
              </div>
            </div>
          </div>
          
          <nav className="flex items-center bg-slate-100/50 p-2 rounded-[2rem] border border-slate-200 overflow-x-auto max-w-full md:max-w-none scroll-hide shadow-inner">
            {[
              { id: 'chat', label: 'Strategy', icon: 'fa-brain' },
              { id: 'coach', label: 'Neural Partner', icon: 'fa-headset' },
              { id: 'studio', label: 'Asset Lab', icon: 'fa-palette' },
              { id: 'auditor', label: 'Site Auditor', icon: 'fa-magnifying-glass-chart' },
              { id: 'pulse', label: 'Viral Pulse', icon: 'fa-bolt-lightning' },
              { user: user?.role === 'admin' || user?.role === 'super_admin', id: 'admin', label: 'Nexus', icon: 'fa-shield-halved' }
            ].filter(item => !item.user || item.user).map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                  currentView === item.id 
                    ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200 border-slate-200' 
                    : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <i className={`fa-solid ${item.icon} text-xs`}></i>
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Operational</span>
            </div>
            <button onClick={handleOpenKeySelector} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center shadow-sm group">
              <i className="fa-solid fa-key text-xs group-hover:rotate-12 transition-transform"></i>
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden flex flex-col items-center bg-slate-50/30">
          {errorMessage ? (
            <div className="flex-1 flex items-center justify-center p-8 animate-fade w-full">
              <div className="max-w-md bg-white border border-slate-200 p-12 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500 opacity-20"></div>
                <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                   <i className="fa-solid fa-triangle-exclamation text-rose-500 text-4xl"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Protocol Error</h2>
                <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed italic">"{errorMessage}"</p>
                <button onClick={() => setErrorMessage(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95">Re-Initialize Link</button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden flex flex-col">
              {currentView === 'chat' && renderStrategyView()}
              {currentView === 'studio' && <CreativeStudio />}
              {currentView === 'auditor' && <SiteAuditor />}
              {currentView === 'pulse' && <ViralPulse />}
              {currentView === 'coach' && <LiveCoach />}
              {currentView === 'admin' && <AdminDashboard />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);



export default App;
