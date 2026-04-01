import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Users, CreditCard, Ticket, Activity, ShieldAlert } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { token, user, logout, refresh, fetchWithAuth } = useAuth();

  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Admin stats error:", err);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
    }
  }, [isAuthorized, token, fetchWithAuth]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === 'mdn337320@gmail.com' && adminPassword === 'a20nafir20') {
      setIsAuthorized(true);
      setLoginError('');
    } else {
      setLoginError('Invalid administrative credentials.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: couponCode,
          discount_type: 'percentage',
          discount_value: discount,
          is_active: 1
        })
      });
      if (res.ok) {
        alert('Coupon created');
        setCouponCode('');
      }
    } catch (e) {
      alert('Error creating coupon');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-slate-50/30">
        <div className="max-w-md w-full bg-white border border-slate-200 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600 opacity-20"></div>
          <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
             <ShieldAlert className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight">Admin Authentication</h2>
          <p className="text-slate-500 text-center mb-8 text-sm font-medium">Secure access to the AdStrat Neural Core.</p>
          
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Admin Email</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@adstrat.ai"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-bold text-slate-800"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Access Key</label>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-bold text-slate-800"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center">{loginError}</p>
            )}

            <button 
              type="submit" 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
            >
              Initialize Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-10 animate-fade overflow-y-auto scroll-hide bg-slate-50/30">
      <div className="max-w-7xl mx-auto w-full space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">Admin <span className="text-indigo-600">Nexus.</span></h2>
            <p className="text-slate-500 font-medium">Global system oversight and administrative control center.</p>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">System Operational</span>
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v4.0.2-stable</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Users', value: stats?.userCount || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Active Subs', value: stats?.activeSubs || 0, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Security Level', value: 'Alpha', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Coupon Generator */}
          <div className="lg:col-span-1 bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <Ticket className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Coupon Engine</h3>
            </div>
            <form onSubmit={handleCreateCoupon} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Promo Code</label>
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ALPHA2024"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-bold text-slate-800"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Discount Percentage</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-bold text-slate-800"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
                </div>
              </div>
              <button 
                type="submit"
                disabled={isLoading || !couponCode}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-2xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
                {isLoading ? 'Deploying...' : 'Deploy Coupon'}
              </button>
            </form>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Activity className="w-32 h-32 text-white" />
            </div>
            <div className="flex items-center justify-between mb-10 relative z-10">
              <h3 className="text-xl font-black text-white tracking-tight">Neural Audit Logs</h3>
              <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all">Export CSV</button>
            </div>
            <div className="space-y-4 relative z-10 max-h-[500px] overflow-y-auto pr-4 scroll-hide">
              {stats?.recentLogs?.map((log: any) => (
                <div key={log.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      log.module === 'auth' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                      log.module === 'billing' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    }`}>
                      {log.module === 'auth' ? <Users className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{log.action}</p>
                        <span className="text-[8px] font-black px-2 py-0.5 bg-white/10 rounded-full text-slate-500 uppercase tracking-widest">{log.module}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ID: {log.user_id || 'SYS'}</p>
                     <p className="text-[9px] text-slate-600 font-mono italic">{JSON.stringify(log.metadata).slice(0, 25)}...</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                <div className="py-20 text-center">
                   <Activity className="w-12 h-12 text-slate-800 mx-auto mb-4 opacity-20" />
                   <p className="text-slate-500 italic text-sm font-medium">No system activity recorded in the current epoch.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
