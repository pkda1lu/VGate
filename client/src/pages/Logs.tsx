import { 
  Activity, 
  Trash2, 
  Terminal,
  Server,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getLogs } from '../lib/api';
import useSWR from 'swr';

export default function Logs() {
  const { data: logsData, mutate, isLoading } = useSWR('/settings/logs', () => getLogs().then(res => res.data), {
    refreshInterval: 2000, // Refresh every 2 seconds
    revalidateOnFocus: true
  });
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsData) {
        setLogs(logsData);
    }
  }, [logsData]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = () => setLogs([]);
  
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500 max-w-6xl mx-auto">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary glow shadow-primary/5">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          </div>
          <p className="text-muted-foreground mt-2">Real-time terminal output and service events</p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={() => mutate()}
                disabled={isLoading}
                className="bg-white/5 hover:bg-white/10 text-foreground px-4 py-2 rounded-xl font-semibold flex items-center gap-2 border border-white/5 transition-all disabled:opacity-50"
            >
                <Activity className={`w-4 h-4 ${isLoading ? 'animate-pulse' : ''}`} /> Refresh
            </button>
            <button className="bg-white/5 hover:bg-white/10 text-foreground px-4 py-2 rounded-xl font-semibold flex items-center gap-2 border border-white/5 transition-all">
                <Filter className="w-4 h-4" /> Filter
            </button>
            <button onClick={clearLogs} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 border border-red-500/10 transition-all">
                <Trash2 className="w-4 h-4" /> Clear
            </button>
        </div>
      </header>

      <div className="glass rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[600px] glow">
        <div className="bg-white/[0.03] px-6 py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest opacity-50">xray.service.log</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Live Stream</span>
            </div>
        </div>

        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 selection:bg-primary/20"
        >
            {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p>Fetching logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-50">
                    <Server className="w-12 h-12" />
                    <p>No log entries found for the current session.</p>
                </div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="flex gap-4 group">
                        <span className="text-white/20 select-none text-right w-8">{i + 1}</span>
                        <span className="text-white/80 group-hover:text-white transition-colors break-all whitespace-pre-wrap">{log}</span>
                    </div>
                ))
            )}
        </div>
        
        <div className="bg-white/[0.01] px-6 py-3 border-t border-white/5 flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground italic font-medium">Auto-scrolling enabled • Press Ctrl+C to copy</p>
            <div className="flex gap-4">
                <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    Buffer: 512 lines
                </span>
            </div>
        </div>
      </div>
      
      {/* Quick Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DiagCard 
            icon={<Server className="w-5 h-5" />} 
            label="Service Uptime" 
            value="14h 22m 31s" 
            status="healthy"
          />
          <DiagCard 
            icon={<Activity className="w-5 h-5" />} 
            label="Log Intensity" 
            value="low (2.4/min)" 
            status="healthy"
          />
          <DiagCard 
            icon={<AlertCircle className="w-5 h-5" />} 
            label="Error Rate" 
            value="0.01%" 
            status="healthy"
          />
      </div>
    </div>
  );
}

function DiagCard({ icon, label, value, status }: any) {
    return (
        <div className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4 glow hover:border-white/10 transition-all">
            <div className={`p-3 rounded-2xl bg-white/5 ${status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{label}</span>
                <span className="text-lg font-bold">{value}</span>
            </div>
        </div>
    );
}
