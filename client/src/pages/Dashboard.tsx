import { motion } from 'framer-motion';
import { 
  Activity, 
  ArrowUpRight, 
  Users, 
  Server, 
  Cpu, 
  Loader2,
  ArrowDownRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInbounds, getClients, getSystemMetrics } from '../lib/api';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  return `${d}d ${h}h ${m}m`;
};

// Generates smooth random walk data for the live chart
const generateInitialData = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    tx: Math.random() * 50 + 20,
    rx: Math.random() * 80 + 40
  }));
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: inbounds, isLoading: loadingInbounds } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  const { data: clients, isLoading: loadingClients } = useSWR('/clients', () => getClients().then(res => res.data));
  const { data: metrics, isLoading: loadingMetrics } = useSWR('/system/metrics', () => getSystemMetrics().then(res => res.data), { refreshInterval: 5000 });

  const [chartData, setChartData] = useState(generateInitialData());

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1)];
        const lastTx = newData[newData.length - 1].tx;
        const lastRx = newData[newData.length - 1].rx;
        
        newData.push({
          time: prev[prev.length - 1].time + 1,
          tx: Math.max(10, Math.min(200, lastTx + (Math.random() - 0.5) * 30)),
          rx: Math.max(20, Math.min(300, lastRx + (Math.random() - 0.5) * 50)),
        });
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalClients = clients?.length || 0;
  const onlineClients = clients?.filter((c: any) => c.enabled).length || 0;
  const totalInbounds = inbounds?.length || 0;
  const activeInbounds = inbounds?.filter((i: any) => i.clients?.length > 0).length || 0;

  const totalTrafficRaw = clients?.reduce((acc: number, c: any) => acc + (c.traffic?.total || 0), 0) || 0;

  if (loadingInbounds || loadingClients || loadingMetrics) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
       <Loader2 className="w-12 h-12 text-primary animate-spin" />
       <p className="text-muted-foreground font-medium animate-pulse">Initializing telemetry...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 fade-in">
      <header className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Real-time Monitoring Active
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 bg-white/[0.02] border border-white/5 px-5 py-2.5 rounded-2xl glow">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Core Xray Status</span>
             <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
               <ShieldCheck className="w-4 h-4 text-primary" /> {metrics?.xrayVersion || 'Online'}
             </span>
          </div>
          <div className="w-px h-8 bg-white/10 mx-2" />
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Server Uptime</span>
             <span className="text-sm font-bold text-foreground font-mono">{formatUptime(metrics?.uptime || 0)}</span>
          </div>
        </div>
      </header>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Users" 
          value={`${onlineClients}`}
          sub={`${totalClients} Total Registered`}
          icon={<Users className="w-5 h-5 text-primary" />} 
          trend="up"
        />
        <StatCard 
          title="Active Nodes" 
          value={`${activeInbounds}`}
          sub={`${totalInbounds} Total Configurations`}
          icon={<Server className="w-5 h-5 text-sky-500" />} 
          trend="neutral"
          onClick={() => navigate('/nodes')}
        />
        <StatCard 
          title="Data Transferred" 
          value={formatBytes(totalTrafficRaw)} 
          sub="Accumulated overall usage"
          icon={<Activity className="w-5 h-5 text-emerald-500" />} 
          trend="up"
        />
        <StatCard 
          title="Processing Load" 
          value={`${metrics?.cpu || 0}%`} 
          sub="Current CPU Allocation"
          icon={<Cpu className="w-5 h-5 text-orange-500" />} 
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Chart */}
        <div className="lg:col-span-2 glass flex flex-col rounded-3xl p-6 glow relative overflow-hidden group shadow-2xl shadow-background">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Global Throughput
            </h3>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
               <span className="flex items-center gap-1.5 text-sky-400">
                 <ArrowDownRight className="w-4 h-4" /> Download
               </span>
               <span className="flex items-center gap-1.5 text-primary">
                 <ArrowUpRight className="w-4 h-4" /> Upload
               </span>
            </div>
          </div>

          <div className="flex-1 min-h-[300px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 'dataMax + 50']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(9, 9, 11, 0.9)', 
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
                  }} 
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: any) => [Number(value || 0).toFixed(1) + ' MB/s']}
                />
                <Area 
                  type="monotone" 
                  dataKey="rx" 
                  name="Download"
                  stroke="#38bdf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRx)" 
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="tx" 
                  name="Upload"
                  stroke="var(--color-primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTx)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Resources */}
        <div className="glass rounded-3xl p-6 glow flex flex-col gap-8 relative overflow-hidden shadow-2xl shadow-background">
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-lg font-bold flex items-center gap-2 relative z-10">
            <Server className="w-5 h-5 text-emerald-500" /> Infrastructure
          </h3>
          
          <div className="grid grid-cols-2 gap-6 relative z-10">
            <CircularProgress value={metrics?.cpu || 0} title="CPU" color="#8b5cf6" />
            <CircularProgress value={metrics?.memory.percent || 0} title="RAM" color="#10b981" />
          </div>

          <div className="space-y-6 mt-4 relative z-10">
            <div className="space-y-2">
               <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Disk Storage</span>
                  <span>{metrics?.disk.percent || 0}%</span>
               </div>
               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(metrics?.disk.percent || 0, 100)}%` }} 
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="h-full bg-sky-500"
                 />
               </div>
               <div className="text-right text-[10px] text-muted-foreground font-mono">
                  {formatBytes(metrics?.disk.used || 0)} / {formatBytes(metrics?.disk.total || 0)}
               </div>
            </div>
            
            <div className="space-y-2">
               <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <span>Memory Buffer</span>
                  <span>{metrics?.memory.percent || 0}%</span>
               </div>
               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(metrics?.memory.percent || 0, 100)}%` }} 
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="h-full bg-emerald-500"
                 />
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, trend, onClick }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, translateY: -2 }}
      onClick={onClick}
      className={`glass p-5 rounded-3xl glow group transition-all border-white/5 hover:border-primary/20 shadow-xl shadow-background/50 relative overflow-hidden ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-500 pointer-events-none">
         {icon}
      </div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-primary/20 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.02)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]">
          {icon}
        </div>
        {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
        {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
      </div>
      <div className="relative z-10">
        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-3xl font-black text-white/90 tracking-tight mb-1">{value}</h4>
        <p className="text-[11px] font-medium text-muted-foreground/80">{sub}</p>
      </div>
    </motion.div>
  );
}

function CircularProgress({ value, title, color }: { value: number, title: string, color: string }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28 flex items-center justify-center filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle 
            cx="56" 
            cy="56" 
            r={radius} 
            stroke="rgba(255,255,255,0.05)" 
            strokeWidth="10" 
            fill="transparent" 
          />
          {/* Progress circle */}
          <motion.circle 
            cx="56" 
            cy="56" 
            r={radius} 
            stroke={color} 
            strokeWidth="10" 
            fill="transparent" 
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{value}%</span>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</span>
    </div>
  );
}
