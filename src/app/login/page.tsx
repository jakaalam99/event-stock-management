'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDetails('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDetails(data.details || '');
        throw new Error(data.error || 'Login failed');
      }

      // Store info for UI and transactions
      localStorage.setItem('user_role', data.user.role);
      localStorage.setItem('user_name', data.user.name);
      localStorage.setItem('user_id', data.user.id);
      
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans overflow-hidden relative">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-4 rotate-3 transform hover:rotate-0 transition-all duration-500">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">EventStock</h1>
          <p className="text-muted-foreground font-medium mt-1">Enterprise Inventory Management</p>
        </div>

        <div className="card p-8 md:p-10 shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary">Sign In</h2>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" size={18} />
                <input 
                  type="email" 
                  required 
                  className="input pl-12 h-14 bg-muted/30 border-none focus:ring-2 focus:ring-accent/20 transition-all text-sm md:text-base font-medium" 
                  placeholder="admin@eventstock.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" size={18} />
                <input 
                  type="password" 
                  required 
                  className="input pl-12 h-14 bg-muted/30 border-none focus:ring-2 focus:ring-accent/20 transition-all text-sm md:text-base font-medium" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/10 text-error text-xs font-bold py-3 px-4 rounded-xl flex flex-col gap-2 animate-shake">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-error" />
                  {error}
                </div>
                {details && (
                  <div className="mt-1 p-2 bg-error/5 rounded-lg font-mono text-[9px] break-all border border-error/10 overflow-auto max-h-32">
                    {details}
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary h-14 rounded-xl text-base font-black uppercase tracking-widest mt-4 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group"
            >
              <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
              {loading && <Loader2 className="animate-spin absolute" size={24} />}
            </button>
          </form>

        </div>
        
        <p className="text-center text-xs text-muted-foreground/60 mt-10 font-bold uppercase tracking-[0.2em]">
          &copy; 2026 EventStock Management System
        </p>
      </div>
    </div>
  );
}
