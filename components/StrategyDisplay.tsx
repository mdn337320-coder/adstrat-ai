
import React, { useState, useMemo } from 'react';
import { AdStrategy } from '../types';
import { GeminiService } from '../services/geminiService';

interface StrategyDisplayProps {
  strategy: AdStrategy;
  onReset: () => void;
}

const StrategyDisplay: React.FC<StrategyDisplayProps> = ({ strategy, onReset }) => {
  const [activeTab, setActiveTab] = useState<'blueprint' | 'creative' | 'vault' | 'calc'>('blueprint');
  const [moodboardUrl, setMoodboardUrl] = useState<string | null>(null);
  const [isGeneratingMood, setIsGeneratingMood] = useState(false);

  // ROI Calculator State
  const [price, setPrice] = useState(1500);
  const [cost, setCost] = useState(600);
  const [spend, setSpend] = useState(5000);

  const stats = useMemo(() => {
    const margin = price - cost;
    const breakEvenRoas = price / margin;
    const roas = 3.5; // Benchmark
    const profit = (spend * roas) - (spend * (cost / price)) - spend;
    return { margin, breakEvenRoas, profit };
  }, [price, cost, spend]);

  const handleGenerateMood = async () => {
    setIsGeneratingMood(true);
    const service = new GeminiService();
    const url = await service.generateMoodboard(strategy.visual_moodboard_prompt);
    setMoodboardUrl(url);
    setIsGeneratingMood(false);
  };

  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/30 text-slate-900 overflow-y-auto scroll-hide pb-24 h-full w-full">
      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-10 h-20 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 overflow-x-auto scroll-hide">
          <div className="flex items-center gap-2 mr-6 border-r border-slate-200 pr-6">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <i className="fa-solid fa-brain text-xs"></i>
             </div>
             <span className="text-xs font-black uppercase tracking-widest hidden md:block">Strategy Hub</span>
          </div>
          {['blueprint', 'creative', 'vault', 'calc'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                activeTab === tab 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' 
                : 'text-slate-400 border-transparent hover:bg-slate-50'
              }`}
            >
              {tab === 'calc' ? 'ROI Alpha' : tab === 'vault' ? 'Launch' : tab}
            </button>
          ))}
        </div>
        <button 
          onClick={onReset} 
          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
          title="Reset Strategy"
        >
          <i className="fa-solid fa-rotate-left text-xs"></i>
        </button>
      </div>

      <main className="max-w-7xl mx-auto w-full p-6 md:p-10 lg:p-16 animate-fade">
        {activeTab === 'calc' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade">
             <div className="lg:col-span-5 bg-white border border-slate-200 p-10 md:p-16 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600 opacity-10"></div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12 tracking-tighter">ROI <span className="text-indigo-600">Intelligence.</span></h2>
                <div className="space-y-12">
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Price</span>
                        <span className="text-xl font-black text-slate-900">{price.toLocaleString()} BDT</span>
                      </div>
                      <input type="range" min="100" max="10000" step="100" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unit Cost</span>
                        <span className="text-xl font-black text-slate-900">{cost.toLocaleString()} BDT</span>
                      </div>
                      <input type="range" min="0" max={price} step="50" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monthly Ad Spend</span>
                        <span className="text-xl font-black text-slate-900">{spend.toLocaleString()} BDT</span>
                      </div>
                      <input type="range" min="1000" max="50000" step="500" value={spend} onChange={(e) => setSpend(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                   </div>
                </div>
                <div className="mt-16 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Calculated Margin</p>
                   <p className="text-2xl font-black text-slate-900">{stats.margin.toLocaleString()} BDT <span className="text-xs font-bold text-slate-400 ml-2">({((stats.margin / price) * 100).toFixed(1)}%)</span></p>
                </div>
             </div>

             <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 bg-indigo-600 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                   <div className="relative z-10">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-70">Break-even ROAS</p>
                     <p className="text-6xl md:text-7xl font-black mb-4 tracking-tighter">{stats.breakEvenRoas.toFixed(2)}x</p>
                     <div className="h-px w-12 bg-white/30 mb-6"></div>
                     <p className="text-xs font-bold opacity-60 leading-relaxed italic">"Any ad set performing below this threshold is a critical 'Kill' signal for the algorithm."</p>
                   </div>
                </div>
                <div className="p-10 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
                   <div className="absolute bottom-0 right-0 p-10 opacity-5">
                      <i className="fa-solid fa-vault text-9xl"></i>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-70">Projected Monthly Profit</p>
                   <p className="text-6xl md:text-7xl font-black mb-4 tracking-tighter">{(stats.profit / 1000).toFixed(1)}k</p>
                   <div className="h-px w-12 bg-white/30 mb-6"></div>
                   <p className="text-xs font-bold opacity-60 leading-relaxed italic">"Estimated net profit based on benchmark 3.5x ROAS efficiency."</p>
                </div>
                <div className="md:col-span-2 p-10 md:p-16 bg-white border border-slate-200 rounded-[4rem] shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-16 opacity-[0.03]">
                      <i className="fa-solid fa-chart-line text-[12rem]"></i>
                   </div>
                   <h3 className="text-slate-400 font-black text-[10px] uppercase mb-10 tracking-[0.3em]">Growth Recommendation</h3>
                   <div className="flex flex-col md:flex-row items-center gap-10">
                      <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white text-4xl shadow-2xl shadow-emerald-100 flex-shrink-0 animate-pulse">
                        <i className="fa-solid fa-arrow-trend-up"></i>
                      </div>
                      <div>
                         <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">Alpha Target: {(stats.breakEvenRoas + 1.5).toFixed(2)}x</p>
                         <p className="text-sm md:text-base font-bold text-slate-500 italic leading-relaxed">"Maintain this efficiency to safely scale budget by 20% every 72 hours without margin erosion."</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'blueprint' && (
          <div className="space-y-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Target CPA', value: strategy.max_cpa, color: 'text-indigo-600', bg: 'bg-white', border: 'border-slate-200' },
                { label: 'Kill Switch', value: strategy.optimization_rules.pause_if_cpa_above, color: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100' },
                { label: 'Scale Point', value: `>${strategy.optimization_rules.scale_if_ctr_above}`, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100' },
                { label: 'Neural Model', value: 'Gemini 3.1', color: 'text-white', bg: 'bg-slate-900', border: 'border-slate-800', icon: 'fa-microchip' }
              ].map((stat, i) => (
                <div key={i} className={`p-8 md:p-10 ${stat.bg} border ${stat.border} rounded-[2.5rem] md:rounded-[3rem] shadow-sm relative overflow-hidden group`}>
                  {stat.icon && <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform"><i className={`fa-solid ${stat.icon} text-4xl`}></i></div>}
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${stat.color === 'text-white' ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  <p className={`text-3xl md:text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-12">
                <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-16 opacity-[0.02]">
                    <i className="fa-solid fa-chess-knight text-[15rem]"></i>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 mb-12 tracking-tighter">Strategic <span className="text-indigo-600">Alpha.</span></h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-12">
                      <div className="relative">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-indigo-600 rounded-full opacity-20"></div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6">Targeting Hypothesis</p>
                        <p className="text-lg font-bold text-slate-700 leading-relaxed italic">"{strategy.targeting_logic.primary}"</p>
                      </div>
                      <div className="pt-10 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Interest Clusters</p>
                        <div className="flex flex-wrap gap-3">
                          {strategy.targeting_logic.secondary.split(',').map((tag, i) => (
                            <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest">{tag.trim()}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-10 md:p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <i className="fa-solid fa-route text-6xl"></i>
                      </div>
                      <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-10 border-b border-slate-800 pb-6">Launch Roadmap</h4>
                      <div className="space-y-8">
                        {strategy.launch_roadmap.map((r, i) => (
                          <div key={i} className="flex gap-6 items-start group">
                             <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-[11px] font-black text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">0{i+1}</div>
                             <div className="flex-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{r.day}</p>
                                <p className="text-sm font-bold text-slate-200 leading-snug mb-2">{r.action}</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">KPI: {r.metric_to_watch}</p>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <div className="bg-white border border-slate-200 p-10 md:p-12 rounded-[4rem] shadow-sm relative overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                  <h3 className="text-slate-900 font-black text-xl tracking-tight mb-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                      <i className="fa-solid fa-list-check text-[10px]"></i>
                    </div>
                    Pre-Launch Sync
                  </h3>
                  <div className="space-y-6">
                    {strategy.pre_production_checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-5 group">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-[10px] text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <i className="fa-solid fa-check"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed group-hover:text-slate-900 transition-colors">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-600 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-indigo-100">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-70">Strategic Confidence</h4>
                   <div className="flex items-end gap-4 mb-6">
                      <span className="text-6xl font-black tracking-tighter">94%</span>
                      <span className="text-xs font-bold opacity-60 mb-3">Alpha Score</span>
                   </div>
                   <p className="text-xs font-bold opacity-70 leading-relaxed italic">"High probability of conversion leak closure within 48 hours of launch."</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StrategyDisplay;
