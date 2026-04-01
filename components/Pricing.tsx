import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Check, Zap, Crown, ShieldCheck } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  quota_limit: number;
  features: string[];
}

const Pricing: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    fetch('/api/billing/plans')
      .then(res => res.json())
      .then(setPlans);
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!token) {
      alert('Please login to subscribe');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, interval })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-10 animate-fade overflow-y-auto scroll-hide bg-slate-50/30">
      <div className="max-w-7xl mx-auto w-full space-y-16 py-10">
        {/* Header Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-indigo-100 shadow-sm">
            Subscription Infrastructure
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter">Scale Your <span className="text-indigo-600">Empire.</span></h2>
          <p className="text-slate-500 font-bold text-lg max-w-2xl mx-auto leading-relaxed">Choose the intelligence tier that matches your growth velocity. All plans include neural strategy synthesis.</p>
          
          <div className="flex items-center justify-center gap-6 pt-4">
            <span className={`text-xs font-black uppercase tracking-widest ${interval === 'month' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
            <button 
              onClick={() => setInterval(interval === 'month' ? 'year' : 'month')}
              className="w-16 h-8 bg-slate-200 rounded-full relative p-1.5 transition-all hover:bg-slate-300 shadow-inner"
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${interval === 'year' ? 'translate-x-8' : 'translate-x-0'}`}></div>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-widest ${interval === 'year' ? 'text-slate-900' : 'text-slate-400'}`}>Yearly</span>
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest animate-pulse">Save 20%</span>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`p-10 rounded-[3rem] border transition-all duration-500 hover:shadow-2xl relative flex flex-col ${
              plan.id === 'pro' 
              ? 'bg-slate-900 text-white border-slate-800 scale-105 shadow-2xl z-10' 
              : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                  Most Popular
                </div>
              )}
              
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${plan.id === 'pro' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-50 text-indigo-600 border border-slate-100'}`}>
                    {plan.id === 'starter' && <Zap className="w-6 h-6" />}
                    {plan.id === 'pro' && <Crown className="w-6 h-6" />}
                    {plan.id === 'elite' && <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-widest tracking-tight">{plan.name}</h3>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${plan.id === 'pro' ? 'text-slate-500' : 'text-slate-400'}`}>Intelligence Tier</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter">${(interval === 'year' ? plan.yearly_price : plan.monthly_price) / 100}</span>
                  <span className={`text-xs font-bold ${plan.id === 'pro' ? 'text-slate-500' : 'text-slate-400'}`}>/{interval}</span>
                </div>
              </div>

              <div className="mb-10 space-y-6 flex-1">
                <div className="space-y-4">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${plan.id === 'pro' ? 'text-slate-500' : 'text-slate-400'}`}>Core Features</p>
                  <ul className="space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-4 text-sm font-bold">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.id === 'pro' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className={plan.id === 'pro' ? 'text-slate-300' : 'text-slate-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${plan.id === 'pro' ? 'text-slate-500' : 'text-slate-400'}`}>Quota Limit</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{plan.quota_limit} Credits</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${plan.id === 'pro' ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <div className="h-full bg-indigo-500 w-1/4"></div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${
                  plan.id === 'pro' 
                  ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-indigo-900/40' 
                  : 'bg-slate-900 text-white hover:bg-black shadow-slate-200'
                }`}
              >
                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Initiate Plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="pt-10 flex flex-wrap items-center justify-center gap-12 opacity-30 grayscale">
          {['fa-stripe', 'fa-cc-visa', 'fa-cc-mastercard', 'fa-cc-apple-pay'].map((icon, i) => (
            <i key={i} className={`fa-brands ${icon} text-4xl`}></i>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
