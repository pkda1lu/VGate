import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye,
  ShieldCheck,
  Zap,
  Tag,
  Loader2,
  AlertCircle,
  Hash
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { getInbounds, deleteInbound, createInbound } from '../lib/api';
import Modal from '../components/Modal';

export default function InboundList() {
  const { data: inbounds, error, isLoading, mutate } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    tag: '',
    port: 443,
    protocol: 'vless'
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure?')) {
      await deleteInbound(id);
      mutate();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createInbound(formData);
      setShowModal(false);
      mutate();
      setFormData({ tag: '', port: 443, protocol: 'vless' });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Synchronizing proxy nodes...</p>
    </div>
  );

  if (error) return (
    <div className="glass p-8 rounded-3xl border-red-500/20 text-center space-y-4 glow">
       <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
       <h3 className="text-xl font-bold">Server Offline</h3>
       <p className="text-muted-foreground">Unable to reach the management API.</p>
       <button onClick={() => mutate()} className="bg-primary/20 border border-primary/20 px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary/30 transition-colors">Reconnect</button>
    </div>
  );
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Proxy Inbounds</h1>
          <p className="text-muted-foreground">Manage your inbound connections and protocols</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-2xl font-semibold flex items-center gap-2 transition-all glow shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Add Inbound
        </button>
      </header>

      <div className="glass rounded-3xl overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 font-semibold text-sm">Protocol</th>
                <th className="px-6 py-4 font-semibold text-sm">Tag & Port</th>
                <th className="px-6 py-4 font-semibold text-sm">Clients</th>
                <th className="px-6 py-4 font-semibold text-sm">Traffic</th>
                <th className="px-6 py-4 font-semibold text-sm text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inbounds?.map((inbound: any) => (
                <tr key={inbound.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                        {inbound.protocol === 'vless' ? <ShieldCheck className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </div>
                      <span className="font-semibold uppercase text-xs tracking-wider">{inbound.protocol}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" /> {inbound.tag}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">Port: {inbound.port}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex -space-x-2">
                       {/* Avatars mockup */}
                       {[1,2,3].slice(0, Math.min(inbound.clients, 3)).map(i => (
                         <div key={i} className="w-7 h-7 rounded-full bg-white/10 border-2 border-background ring-1 ring-white/5 flex items-center justify-center text-[10px] font-bold">
                           U{i}
                         </div>
                       ))}
                       {inbound.clients > 3 && (
                         <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background ring-1 ring-white/5 flex items-center justify-center text-[10px] font-bold text-primary">
                           +{inbound.clients - 3}
                         </div>
                       )}
                       {inbound.clients === 0 && <span className="text-muted-foreground text-xs italic">No clients</span>}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium">{inbound.traffic || '0 B'}</td>
                  <td className="px-6 py-5 text-center">
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                       inbound.clients?.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-muted-foreground border border-white/10'
                     }`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${inbound.clients?.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                       {inbound.clients?.length > 0 ? 'Online' : 'Idle'}
                     </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                      <ActionBtn icon={<Eye className="w-4 h-4" />} color="text-sky-400" />
                      <ActionBtn icon={<Settings className="w-4 h-4" />} color="text-muted-foreground" />
                      <ActionBtn onClick={() => handleDelete(inbound.id)} icon={<Trash2 className="w-4 h-4" />} color="text-red-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Add New Inbound"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Inbound Tag</label>
            <div className="relative group">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                required
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g. vless-reality-main"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Port</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Protocol</label>
              <select
                value={formData.protocol}
                onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium appearance-none"
              >
                <option value="vless" className="bg-background">VLESS</option>
                <option value="vmess" className="bg-background">VMess</option>
                <option value="trojan" className="bg-background">Trojan</option>
                <option value="shadowsocks" className="bg-background">Shadowsocks</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={() => setShowModal(false)}
               className="flex-1 bg-white/5 hover:bg-white/10 text-foreground font-bold py-3 rounded-2xl border border-white/5 transition-all"
             >
               Cancel
             </button>
             <button
               disabled={isCreating}
               className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
             >
               {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               Create Node
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ActionBtn({ icon, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all ${color}`}>
      {icon}
    </button>
  );
}
