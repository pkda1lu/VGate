import React, { useState } from 'react';
import useSWR from 'swr';
import { api, fetcher } from '../lib/api';
import { 
  Plus, 
  Trash2, 
  Server, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Copy,
  CheckCircle2
} from 'lucide-react';
import Modal from '../components/Modal';

export default function NodeList() {
  const { data: nodes, mutate } = useSWR('/nodes', fetcher);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/nodes', formData);
    setShowModal(false);
    setFormData({ name: '', address: '' });
    mutate();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this node?')) {
      await api.delete(`/nodes/${id}`);
      mutate();
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const slaveNodes = nodes?.filter((n: any) => !n.isMaster) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Серверные Ноды</h1>
          <p className="text-muted-foreground mt-1">Управление кластером и распределением нагрузки</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 glow hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" /> Добавить сервер
        </button>
      </div>

      {/* Graphical Representation */}
      <div className="relative h-[450px] bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden group">
        <div className="absolute inset-0 bg-stripes-white opacity-[0.03]" />
        
        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 w-full h-full">
          {slaveNodes.map((node: any, i: number) => {
            const angle = (i * (360 / (slaveNodes.length || 1))) * (Math.PI / 180);
            const radius = 150;
            const x2 = 50 + Math.cos(angle) * 35;
            const y2 = 50 + Math.sin(angle) * 35;
            
            return (
              <g key={node.id}>
                <line 
                  x1="50%" y1="50%" 
                  x2={`${x2}%`} y2={`${y2}%`} 
                  stroke={node.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'} 
                  strokeWidth="2" 
                  strokeDasharray="5,5" 
                  className={node.status === 'online' ? 'animate-pulse' : ''}
                />
                {node.status === 'online' && (
                   <circle r="3" fill="#10b981" className="animate-ping">
                      <animateMotion dur="3s" repeatCount="indefinite" path={`M ${window.innerWidth/2} ${450/2} L ${window.innerWidth/2 + Math.cos(angle)*radius} ${450/2 + Math.sin(angle)*radius}`} />
                   </circle>
                )}
              </g>
            )
          })}
        </svg>

        {/* Master Node (Center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-primary/40 flex flex-col items-center justify-center relative glow group-hover:scale-110 transition-transform duration-700">
            <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-20" />
            <ShieldCheck className="w-10 h-10 text-primary mb-1" />
            <span className="text-[10px] font-black uppercase tracking-tighter text-primary">Master Panel</span>
            <div className="absolute -bottom-3 bg-primary text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap">Central Hub</div>
          </div>
        </div>

        {/* Slave Nodes (Orbit) */}
        {slaveNodes.map((node: any, i: number) => {
             const angle = (i * (360 / slaveNodes.length)) * (Math.PI / 180);
             const radiusX = 35; // %
             const radiusY = 35; // %
             const left = 50 + Math.cos(angle) * radiusX;
             const top = 50 + Math.sin(angle) * radiusY;

             return (
               <div 
                 key={node.id}
                 className="absolute -translate-x-1/2 -translate-y-1/2 group/node"
                 style={{ left: `${left}%`, top: `${top}%` }}
               >
                 <div className={`w-20 h-20 rounded-3xl border-2 rotate-45 flex items-center justify-center transition-all duration-500 hover:rotate-0 hover:scale-110 ${
                    node.status === 'online' 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                    : 'bg-white/5 border-white/10 text-muted-foreground opacity-60'
                 }`}>
                   <div className="-rotate-45 group-hover/node:rotate-0 transition-transform">
                      <Server className="w-8 h-8" />
                   </div>
                   
                   {/* Status Indicator */}
                   <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border-4 border-inherit flex items-center justify-center overflow-hidden">
                      <div className={`w-full h-full ${node.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                   </div>
                 </div>
                 <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap pointer-events-none opacity-0 group-hover/node:opacity-100 transition-opacity">
                    <p className="font-bold text-xs">{node.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{node.address}</p>
                 </div>
               </div>
             )
        })}
      </div>

      {/* Nodes List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes?.map((node: any) => (
             <div key={node.id} className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 hover:bg-white/[0.04] transition-all group border-b-4 border-b-transparent hover:border-b-primary/40 relative overflow-hidden">
                {node.isMaster && <div className="absolute top-4 right-4 bg-primary/20 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-primary/20">System Master</div>}
                
                <div className="flex items-start justify-between mb-6">
                   <div className={`p-4 rounded-2xl ${node.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-muted-foreground'}`}>
                      <Server className="w-6 h-6" />
                   </div>
                   <div className="flex gap-2">
                      {!node.isMaster && (
                        <button 
                          onClick={() => handleDelete(node.id)}
                          className="p-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-3 rounded-xl hover:bg-white/10 text-muted-foreground transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                   </div>
                </div>

                <div className="space-y-1 mb-6">
                   <h3 className="text-xl font-black">{node.name}</h3>
                   <p className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                       <Zap className="w-3 h-3" /> {node.address}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                   <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                      <span className="text-[8px] font-black uppercase text-muted-foreground block mb-1">Status</span>
                      <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                         <span className={`text-[10px] font-bold uppercase ${node.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                           {node.status === 'online' ? 'Online' : 'Offline'}
                         </span>
                      </div>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                      <span className="text-[8px] font-black uppercase text-muted-foreground block mb-1">Last Sync</span>
                      <span className="text-[10px] font-bold text-foreground">
                        {node.lastSeen ? new Date(node.lastSeen).toLocaleTimeString() : 'Never'}
                      </span>
                   </div>
                </div>

                {!node.isMaster && (
                   <div className="bg-background/50 rounded-2xl p-4 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase text-white/40">Node API Key</span>
                         <button 
                           onClick={() => copyToClipboard(node.apiKey, node.id)}
                           className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                         >
                            {copiedKey === node.id ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Key</>}
                         </button>
                      </div>
                      <div className="bg-black/20 rounded-lg p-2 font-mono text-[10px] truncate text-muted-foreground border border-white/5">
                         {node.apiKey}
                      </div>
                   </div>
                )}
             </div>
          ))}
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title="Добавить серверную ноду"
      >
        <form onSubmit={handleAddNode} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Название ноды</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 px-4 focus:outline-none focus:border-primary/50 transition-all"
              placeholder="e.g. Frankfurt-01"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">IP или Домен</label>
            <input 
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl h-12 px-4 focus:outline-none focus:border-primary/50 transition-all"
              placeholder="e.g. 1.2.3.4"
            />
          </div>
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 mt-4">
             <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Zap className="w-4 h-4" />
             </div>
             <p className="text-[10px] text-muted-foreground leading-relaxed">
                После добавления ноды вы получите <b>API Key</b>. Используйте его в скрипте установки на удаленном сервере для автоматического подключения к этой панели.
             </p>
          </div>
          <button 
            type="submit"
            className="w-full bg-primary text-white h-12 rounded-2xl font-bold mt-6 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            Создать ноду
          </button>
        </form>
      </Modal>
    </div>
  );
}
