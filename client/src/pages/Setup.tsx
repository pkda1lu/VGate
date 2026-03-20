import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, setupAdmin as setupApi } from '../lib/api';
import { Loader2, PlusCircle, ShieldCheck, Lock, User, CheckCircle } from 'lucide-react';

export default function Setup() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAuthStatus().then(res => {
      if (res.data.hasAdmin) navigate('/login');
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
    }
    if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await setupApi({ username, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-auto overflow-y-auto py-10">
      <div className="shimmer absolute inset-0 opacity-10 pointer-events-none" />
      
      <div className="w-full max-w-lg p-10 glass rounded-[3.5rem] border border-white/5 space-y-10 glow animate-in fade-in zoom-in-95 duration-500 relative">
        <div className="absolute top-[-5%] right-[-5%] w-[150px] h-[150px] bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-5 rounded-[2rem] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <PlusCircle className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Security Setup</h1>
            <p className="text-[12px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-2">Initialize Admin Account</p>
          </div>
        </div>

        <div className="text-center bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem]">
            <p className="text-xs text-emerald-400 font-bold leading-relaxed mb-4">First time setup detected. Create your administrative credentials to secure the panel.</p>
            <div className="flex gap-2 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">Secure scrypt hashing activated</span>
            </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl text-sm font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Admin Username</label>
                <div className="relative group">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] py-5 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all font-bold text-md"
                    placeholder="admin"
                />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Secure Password</label>
                <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] py-5 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all font-bold text-md"
                    placeholder="Minimal 8 chars"
                />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Confirm Identity Key</label>
                <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] py-5 pl-14 pr-6 focus:outline-none focus:border-primary/50 transition-all font-bold text-md"
                    placeholder="Repeat password"
                />
                </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-[3.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all glow shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Create Identity <CheckCircle className="w-6 h-6" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
