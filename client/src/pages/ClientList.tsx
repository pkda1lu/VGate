import { 
  Plus, 
  Trash2, 
  Copy, 
  RefreshCcw, 
  QrCode,
  Clock,
  Navigation,
  Mail,
  Loader2,
  AlertCircle,
  Users,
  Shield,
  Zap
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { getClients, deleteClient, createClient, getInbounds } from '../lib/api';
import Modal from '../components/Modal';

export default function ClientList() {
  const { data: clients, error, isLoading, mutate } = useSWR('/clients', () => getClients().then(res => res.data));
  const { data: inbounds } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    inboundId: '',
    email: '',
    totalGb: 0,
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      mutate();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.inboundId) return alert('Select a proxy node first');
    setIsCreating(true);
    try {
      await createClient(formData);
      setShowModal(false);
      mutate();
      setFormData({ inboundId: '', email: '', totalGb: 0 });
    } finally {
      setIsCreating(false);
    }
  };

  const getTrafficPercentage = (usage: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Syncing client data...</p>
    </div>
  );

  if (error) return (
    <div className="glass p-8 rounded-3xl border-red-500/20 text-center space-y-4 glow">
       <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
       <h3 className="text-xl font-bold">API Offline</h3>
       <p className="text-muted-foreground">The panel backend is currently unreachable.</p>
       <button onClick={() => mutate()} className="bg-primary/20 border border-primary/20 px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary/30 transition-colors">Reconnect</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
          <p className="text-muted-foreground">Manage individual user quotas and visibility</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => mutate()} className="glass hover:bg-white/[0.05] text-foreground px-4 py-2.5 rounded-2xl font-semibold flex items-center gap-2 border border-white/10 transition-all">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-2xl font-semibold flex items-center gap-2 transition-all glow shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Create Client
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {clients?.map((client: any) => (
          <div key={client.id} className="glass p-6 rounded-3xl glow group hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center gap-6">
             <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary self-start shadow-[0_0_15px_rgba(139,92,246,0.1)]">
               <Mail className="w-6 h-6" />
             </div>
             
             <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-lg truncate flex items-center gap-2">
                  {client.email}
                  {!client.enabled && (
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 uppercase font-black tracking-widest">Disabled</span>
                  )}
                </h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5 font-mono"><Navigation className="w-3.5 h-3.5" /> {client.uuid.substring(0, 18)}...</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {client.expiry ? new Date(client.expiry).toLocaleDateString() : 'No Expiry'}</span>
                </div>
             </div>

             <div className="flex flex-col gap-1 min-w-[160px]">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                   <span className="text-muted-foreground">Quota Usage</span>
                   <span className="text-primary">{(client.traffic?.total / (1024**3)).toFixed(2)} / {client.totalGb || '∞'} GB</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <div 
                      className={`h-full transition-all duration-1000 ${!client.enabled ? 'bg-red-400' : 'bg-primary'}`} 
                      style={{ width: `${getTrafficPercentage(client.traffic?.total || 0, (client.totalGb || 0) * (1024**3))}%` }}
                    />
                </div>
             </div>

             <div className="flex gap-2">
                <IconBtn tooltip="Copy Node Link" icon={<Copy className="w-4 h-4" />} />
                <IconBtn tooltip="Show QR Code" icon={<QrCode className="w-4 h-4" />} />
                <IconBtn onClick={() => handleDelete(client.id)} tooltip="Delete User" icon={<Trash2 className="w-4 h-4" />} color="text-red-400 hover:bg-red-500/10" />
             </div>
          </div>
        ))}
        {clients?.length === 0 && (
          <div className="glass p-12 rounded-3xl border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-center opacity-50">
             <Users className="w-12 h-12 text-muted-foreground" />
             <p className="text-muted-foreground font-medium">No clients found for this server.<br/>Add your first user to start tunneling.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title="Add New Client"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Parent Node</label>
            <div className="relative group">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <select
                required
                value={formData.inboundId}
                onChange={(e) => setFormData({ ...formData, inboundId: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium appearance-none"
              >
                <option value="" disabled className="bg-background">Select an Inbound...</option>
                {inbounds?.map((node: any) => (
                  <option key={node.id} value={node.id} className="bg-background">
                    {node.tag} ({node.protocol}:{node.port})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Client Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Traffic Limit (GB)</label>
            <div className="relative group">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="number"
                value={formData.totalGb}
                onChange={(e) => setFormData({ ...formData, totalGb: parseFloat(e.target.value) })}
                placeholder="0 = Unlimited"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium"
              />
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
               Create Access
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function IconBtn({ icon, color, tooltip, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/20 transition-all ${color || 'text-primary'}`} 
      title={tooltip}
    >
      {icon}
    </button>
  );
}
