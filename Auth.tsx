import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.token) {
        login(data.token, data.refreshToken, data.user);
      } else {
        alert(data.error || 'Authentication failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50/30 animate-fade relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="max-w-md w-full bg-white border border-slate-200 p-10 md:p-16 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-600 to-transparent opacity-30"></div>
        
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-200 rotate-3 hover:rotate-0 transition-transform duration-500">
            <LogIn className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">
            {isLogin ? <>Neural <span className="text-indigo-600">Gateway.</span></> : <>Join the <span className="text-indigo-600">Elite.</span></>}
          </h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">
            {isLogin ? 'Access your strategic command center and neural partner.' : 'Start scaling your brand with production-grade AI intelligence.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Identity (Email)</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800 transition-all placeholder:text-slate-300"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95"
          >
            {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isLogin ? 'Initiate Session' : 'Create Profile')}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-12 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors"
          >
            {isLogin ? "Request New Access Profile" : "Existing Profile? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
