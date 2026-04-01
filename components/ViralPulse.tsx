
import React, { useState, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';

interface PulseTrend {
  title: string;
  category: string;
  hook_angle: string;
  vibe_check: string;
  relevance_score: number;
}

const ViralPulse: React.FC = () => {
  const [trends, setTrends] = useState<PulseTrend[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState('Global');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchTrends = async (selectedCountry: string = country) => {
    setIsLoading(true);
    setTrends([]);
    try {
      const service = new GeminiService();
      const data = await service.getViralTrends(selectedCountry);
      
      const trendsList = data.trends || [];
      const sourcesList = data.sources || [];
      
      // Map the deterministic trends to the UI format
      const mappedTrends = trendsList.map((t: any) => ({
        title: t.title,
        category: t.category || 'Market Node',
        hook_angle: t.hook_angle || 'Deterministic pattern detected.',
        vibe_check: t.vibe_check || `Verified at ${new Date().toLocaleTimeString()}`,
        relevance_score: t.relevance_score || 85
      }));
      
      setTrends(mappedTrends);
      setSources(sourcesList);
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (e) {
      console.error("Pulse Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setCountry(newCountry);
    fetchTrends(newCountry);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-10 animate-fade overflow-y-auto scroll-hide bg-slate-50/30">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[2.5rem] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm">Market Ingress v4.0</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">Real-Time Feed</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Viral <span className="text-rose-600">Pulse.</span></h2>
            <p className="text-slate-500 font-medium max-w-md">Ingest global ad-DNA and localized conversion patterns to stay ahead of market shifts.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Market</label>
              </div>
              <div className="relative">
                <select 
                  value={country}
                  onChange={handleCountryChange}
                  className="appearance-none w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-4 text-xs font-black text-slate-700 focus:outline-none focus:border-rose-400 transition-all cursor-pointer shadow-sm hover:bg-white"
                >
                  <option value="Global">Global Ecosystem</option>
                  <option value="Bangladesh">Bangladesh 🇧🇩</option>
                  <option value="USA">United States 🇺🇸</option>
                  <option value="UK">United Kingdom 🇬🇧</option>
                  <option value="United Arab Emirates">UAE / GCC 🇦🇪</option>
                  <option value="India">India 🇮🇳</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                  <i className="fa-solid fa-chevron-down text-[10px]"></i>
                </div>
              </div>
            </div>

            <button 
              onClick={() => fetchTrends()} 
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all active:scale-95 mt-6 sm:mt-0"
            >
              {isLoading ? <i className="fa-solid fa-sync fa-spin"></i> : <i className="fa-solid fa-bolt-lightning"></i>}
              {isLoading ? 'Syncing' : 'Refresh Pulse'}
            </button>
          </div>
        </div>

        {trends.length > 0 ? (
          <div className="space-y-12 animate-fade pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trends.map((trend, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-[3rem] p-10 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-fire text-6xl"></i>
                  </div>
                  
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase border border-emerald-100 shadow-sm">{trend.relevance_score}% Confidence</span>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                      <i className="fa-solid fa-bookmark text-xs"></i>
                    </button>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-rose-600 transition-colors leading-tight">{trend.title}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{trend.category} | Market Node</p>
                  
                  <div className="space-y-4 flex-1">
                     <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group-hover:bg-white group-hover:border-rose-100 transition-all">
                        <p className="text-[9px] font-black text-rose-600 uppercase mb-3 tracking-widest">Alpha Hook Angle</p>
                        <p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{trend.hook_angle}"</p>
                     </div>
                     <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Creative Direction</p>
                        <p className="text-xs font-bold text-slate-300 leading-snug">{trend.vibe_check}</p>
                     </div>
                  </div>

                  <button className="mt-8 w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-plus"></i> Inject to Strategy
                  </button>
                </div>
              ))}
            </div>

            {sources.length > 0 && (
              <div className="pt-12 border-t border-slate-200">
                 <div className="flex items-center justify-between mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                       <i className="fa-solid fa-server opacity-30"></i> Neural Grounding Chunks
                    </p>
                    <span className="text-[9px] font-bold text-slate-300 italic">Sync complete at {lastUpdated}</span>
                 </div>
                 <div className="flex flex-wrap gap-4">
                    {sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm flex items-center gap-3 group">
                         <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:bg-rose-50 transition-colors"><i className="fa-solid fa-link text-[10px] opacity-40"></i></div>
                         {s.title.length > 35 ? s.title.slice(0, 35) + '...' : s.title}
                      </a>
                    ))}
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-40 flex flex-col items-center justify-center text-center animate-fade">
             <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-slate-100">
                <i className="fa-solid fa-earth-asia text-slate-200 text-6xl"></i>
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-3">Initialize Trend Analysis</h3>
             <p className="text-slate-400 font-bold text-sm max-w-sm italic leading-relaxed">
                Select a target market to ingest viral ad patterns, hook architectures, and localized conversion logic.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViralPulse;
