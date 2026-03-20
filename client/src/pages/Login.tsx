import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, login as loginApi } from '../lib/api';
import { Loader2, ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAuthStatus().then(res => {
      if (!res.data.hasAdmin) navigate('/setup');
      else setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await loginApi({ username, password });
      localStorage.setItem('vgate_token', res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-auto">
      <div className="shimmer absolute inset-0 opacity-10 pointer-events-none" />
      
      <div className="w-full max-w-md p-8 glass rounded-[3rem] border border-white/5 space-y-8 glow animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-3xl bg-primary/20 border border-primary/30 text-primary shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">VGate Login</h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Management Access Control</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Username</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all font-bold text-sm"
                placeholder="Admin username"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-all font-bold text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all glow shadow-primary/30 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Next <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
