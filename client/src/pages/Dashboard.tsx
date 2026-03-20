import { motion } from 'framer-motion';
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Server, 
  Cpu, 
  HardDrive,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import useSWR from 'swr';
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

export default function Dashboard() {
  const { data: inbounds, isLoading: loadingInbounds } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  const { data: clients, isLoading: loadingClients } = useSWR('/clients', () => getClients().then(res => res.data));
  const { data: metrics, isLoading: loadingMetrics } = useSWR('/system/metrics', () => getSystemMetrics().then(res => res.data), { refreshInterval: 5000 });

  const totalClients = clients?.length || 0;
  const onlineClients = clients?.filter((c: any) => c.enabled).length || 0;
  
  const totalInbounds = inbounds?.length || 0;

  // Calculate total traffic from client accounts
  const totalTrafficRaw = clients?.reduce((acc: number, c: any) => acc + (c.traffic?.total || 0), 0) || 0;

  if (loadingInbounds || loadingClients || loadingMetrics) return (
    <div className="flex items-center justify-center min-h-[500px]">
       <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Server Status
        </p>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Clients Visibility" 
          value={`${onlineClients}/${totalClients}`} 
          icon={<Users className="w-5 h-5 text-primary" />} 
          change={`${totalInbounds} Inbounds`} 
        />
        <StatCard 
          title="Total Management" 
          value={formatBytes(totalTrafficRaw)} 
          icon={<Activity className="w-5 h-5 text-emerald-500" />} 
          change="Accumulated" 
        />
        <StatCard 
          title="Processor" 
          value={`${metrics?.cpu || 0}%`} 
          icon={<Cpu className="w-5 h-5 text-sky-500" />} 
          change="Active Load"
        />
        <StatCard 
          title="Memory Buffer" 
          value={`${metrics?.memory.percent || 0}%`} 
          icon={<ArrowUpRight className="w-5 h-5 text-orange-500" />} 
          change={formatBytes(metrics?.memory.used || 0)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Chart Mockup (Real data would be mapped here) */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 glow relative overflow-hidden group">
          <div className="shimmer absolute inset-0 opacity-10 pointer-events-none" />
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Traffic Performance
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { t: 0, v: 40 }, { t: 1, v: onlineClients * 10 }, { t: 2, v: 45 }, { t: 3, v: onlineClients * 12 }, { t: 4, v: 48 }, { t: 5, v: onlineClients * 15 }
              ]}>
                <defs>
                  <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(9, 9, 11, 0.9)', 
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke="var(--color-primary)" 
                  fillOpacity={1} 
                  fill="url(#colorV)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resources */}
        <div className="glass rounded-2xl p-6 glow flex flex-col gap-6 relative overflow-hidden">
          <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Core Allocation
          </h3>
          
          <div className="space-y-5">
            <ResourceBar label="Processor Load" value={metrics?.cpu || 0} icon={<Cpu className="w-4 h-4" />} color="bg-primary" />
            <ResourceBar label="Memory Buffer" value={metrics?.memory.percent || 0} icon={<Activity className="w-4 h-4" />} color="bg-emerald-500" />
            <ResourceBar label="Storage Pool" value={metrics?.disk.percent || 0} icon={<HardDrive className="w-4 h-4" />} color="bg-sky-500" />
          </div>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Uptime Status</span>
              <span className="font-mono text-white/90">{formatUptime(metrics?.uptime || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground font-medium">Xray Version</span>
              <span className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {metrics?.xrayVersion || 'v1.8.4'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, change }: any) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, translateY: -2 }}
      className="glass p-5 rounded-2xl glow group transition-all cursor-default border-white/5 hover:border-primary/20"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.1)]">
          {icon}
        </div>
        {change && (
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white/5 border border-white/10 opacity-60">
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 opacity-70">{title}</p>
        <h4 className="text-3xl font-black text-white/90 tracking-tight">{value}</h4>
      </div>
    </motion.div>
  );
}

function ResourceBar({ label, value, icon, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="text-white/80">{value}%</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }} 
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
