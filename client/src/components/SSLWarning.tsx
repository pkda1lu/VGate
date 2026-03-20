import { AlertTriangle, ShieldOff, Globe, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SSLWarning() {
    const [isIP, setIsIP] = useState(false);
    const [isHTTP, setIsHTTP] = useState(false);

    useEffect(() => {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Simple IP regex
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        setIsIP(ipRegex.test(hostname));
        setIsHTTP(protocol === 'http:');
    }, []);

    if (!isIP && !isHTTP) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[60] w-[450px] animate-in slide-in-from-right-10 duration-700">
            <div className="glass p-8 rounded-[3rem] border border-orange-500/20 glow shadow-orange-500/10 space-y-6 relative overflow-hidden backdrop-blur-2xl">
                <div className="absolute top-[-10%] right-[-10%] w-[150px] h-[150px] bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-start gap-4">
                    <div className="p-4 rounded-3xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
                        <ShieldOff className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-orange-400">Connectivity Risk</h2>
                        <p className="text-[10px] text-orange-400/60 font-black uppercase tracking-[0.2em]">Security Alert: Insecure Node</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-sm font-bold text-white/90 leading-relaxed">
                        {isHTTP && "Your connection is unencrypted (HTTP). Sensitive credentials could be intercepted."}
                        {isIP && " accessing via direct IP is not recommended for production environments."}
                    </p>
                    
                    <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 space-y-3">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/80">Recommended Actions</span>
                        </div>
                        <ul className="text-xs font-bold text-muted-foreground space-y-1 ml-1 list-none">
                            <li className="flex gap-2 items-center"><Globe className="w-3 h-3 text-orange-400" /> Map a FQDN (domain) to this server</li>
                            <li className="flex gap-2 items-center"><ShieldOff className="w-3 h-3 text-orange-400" /> Setup Let's Encrypt / SSL Certification</li>
                        </ul>
                    </div>
                </div>

                <button className="w-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 group">
                    View Configuration Documentation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
