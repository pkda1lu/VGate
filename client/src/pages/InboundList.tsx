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
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { getInbounds, deleteInbound, createInbound, updateInbound } from '../lib/api';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';

export default function InboundList() {
  const { data: inbounds, error, isLoading, mutate } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInbound, setEditingInbound] = useState<any>(null);
  
  // UI states
  const [sniffingOpen, setSniffingOpen] = useState(true);

  const [formData, setFormData] = useState({
    tag: '',
    port: 443,
    protocol: 'vless',
    security: 'reality',
    sniffingEnabled: true,
    sniffHttp: true,
    sniffTls: true,
    sniffQuic: true,
    sniffFakedns: true,
    metadataOnly: false,
    routeOnly: false,
  });

  const openCreateModal = () => {
    setEditingInbound(null);
    setFormData({
      tag: '',
      port: 443,
      protocol: 'vless',
      security: 'reality',
      sniffingEnabled: true,
      sniffHttp: true,
      sniffTls: true,
      sniffQuic: true,
      sniffFakedns: true,
      metadataOnly: false,
      routeOnly: false,
    });
    setShowModal(true);
  };

  const openEditModal = (inb: any) => {
    setEditingInbound(inb);
    let sniffEnv;
    try { sniffEnv = JSON.parse(inb.sniffing); } catch(e) { sniffEnv = { enabled: true, destOverride: ["http", "tls"] }; }

    setFormData({
      tag: inb.tag,
      port: inb.port,
      protocol: inb.protocol,
      security: 'reality', // stub
      sniffingEnabled: sniffEnv.enabled || false,
      sniffHttp: sniffEnv.destOverride?.includes('http') || false,
      sniffTls: sniffEnv.destOverride?.includes('tls') || false,
      sniffQuic: sniffEnv.destOverride?.includes('quic') || false,
      sniffFakedns: sniffEnv.destOverride?.includes('fakedns') || false,
      metadataOnly: sniffEnv.metadataOnly || false,
      routeOnly: sniffEnv.routeOnly || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this inbound?')) {
      await deleteInbound(id);
      mutate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Transform flat UI state to nested JSON for API
    const destOverride = [];
    if (formData.sniffHttp) destOverride.push("http");
    if (formData.sniffTls) destOverride.push("tls");
    if (formData.sniffQuic) destOverride.push("quic");
    if (formData.sniffFakedns) destOverride.push("fakedns");

    const payload = {
      tag: formData.tag,
      port: formData.port,
      protocol: formData.protocol,
      sniffing: {
        enabled: formData.sniffingEnabled,
        destOverride,
        metadataOnly: formData.metadataOnly,
        routeOnly: formData.routeOnly
      }
    };

    try {
      if (editingInbound) {
        await updateInbound(editingInbound.id, payload);
      } else {
        await createInbound(payload);
      }
      setShowModal(false);
      mutate();
    } finally {
      setIsSubmitting(false);
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
          onClick={openCreateModal}
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
                       {/* Avatars mockup based on real count */}
                       {[...Array(Math.min(inbound.clients?.length || 0, 3))].map((_, i) => (
                         <div key={i} className="w-7 h-7 rounded-full bg-white/10 border-2 border-background ring-1 ring-white/5 flex items-center justify-center text-[10px] font-bold">
                           U{i+1}
                         </div>
                       ))}
                       {inbound.clients?.length > 3 && (
                         <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-background ring-1 ring-white/5 flex items-center justify-center text-[10px] font-bold text-primary">
                           +{(inbound.clients?.length) - 3}
                         </div>
                       )}
                       {(!inbound.clients || inbound.clients.length === 0) && <span className="text-muted-foreground text-xs italic">No clients</span>}
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
                      <ActionBtn icon={<Eye className="w-4 h-4" />} color="text-sky-400" tooltip="View Info" />
                      <ActionBtn onClick={() => openEditModal(inbound)} icon={<Settings className="w-4 h-4" />} color="text-muted-foreground hover:text-white" tooltip="Edit Inbound" />
                      <ActionBtn onClick={() => handleDelete(inbound.id)} icon={<Trash2 className="w-4 h-4" />} color="text-red-400" tooltip="Delete" />
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
        title={editingInbound ? "Редактировать подключение" : "Создать подключение"}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Примечание (Tag)</label>
             <input
               required
               value={formData.tag}
               onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
               placeholder="e.g. vless-reality-main"
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm"
             />
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Протокол</label>
             <select
               value={formData.protocol}
               onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none"
             >
               <option value="vless" className="bg-background">VLESS</option>
               <option value="vmess" className="bg-background">VMess</option>
               <option value="trojan" className="bg-background">Trojan</option>
               <option value="shadowsocks" className="bg-background">Shadowsocks</option>
             </select>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Порт</label>
             <input
               type="number"
               required
               value={formData.port}
               onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm"
             />
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group pt-4 mt-4 border-t border-white/5">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Безопасность</label>
             <div className="flex bg-white/[0.03] border border-white/5 rounded-xl p-1 gap-1 h-11">
                {['none', 'reality', 'tls'].map(sec => (
                   <button 
                     key={sec}
                     type="button" 
                     onClick={() => setFormData({...formData, security: sec})}
                     className={`flex-1 rounded-lg text-sm font-bold transition-all capitalize ${
                       formData.security === sec ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                     }`}
                   >
                     {sec === 'none' ? 'Пусто' : sec}
                   </button>
                ))}
             </div>
          </div>

          {/* Sniffing Accordion */}
          <div className="border border-white/5 bg-white/[0.01] rounded-2xl mt-6 overflow-hidden transition-all">
            <button 
              type="button" 
              onClick={() => setSniffingOpen(!sniffingOpen)}
              className="w-full p-4 flex items-center gap-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
            >
               {sniffingOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
               <span className="font-semibold text-sm">Sniffing</span>
            </button>
            
            {sniffingOpen && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                   <Toggle 
                     checked={formData.sniffingEnabled} 
                     onChange={(v) => setFormData({...formData, sniffingEnabled: v})} 
                     label="Включено (Enabled)" 
                   />
                </div>
                
                <div className="flex flex-wrap gap-4 items-center pl-14">
                   <Checkbox label="HTTP" checked={formData.sniffHttp} onChange={(v) => setFormData({...formData, sniffHttp: v})} />
                   <Checkbox label="TLS" checked={formData.sniffTls} onChange={(v) => setFormData({...formData, sniffTls: v})} />
                   <Checkbox label="QUIC" checked={formData.sniffQuic} onChange={(v) => setFormData({...formData, sniffQuic: v})} />
                   <Checkbox label="FAKEDNS" checked={formData.sniffFakedns} onChange={(v) => setFormData({...formData, sniffFakedns: v})} />
                </div>
                {/* Advanced toggles */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-semibold text-muted-foreground px-4">Metadata Only</span>
                     <Toggle checked={formData.metadataOnly} onChange={(v) => setFormData({...formData, metadataOnly: v})} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-semibold text-muted-foreground px-4">Route Only</span>
                     <Toggle checked={formData.routeOnly} onChange={(v) => setFormData({...formData, routeOnly: v})} />
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-8 flex gap-3 justify-end items-center border-t border-white/5 mt-8">
             <button
               type="button"
               onClick={() => setShowModal(false)}
               className="bg-transparent hover:bg-white/5 text-foreground font-semibold px-6 py-2.5 rounded-xl transition-all"
             >
               Закрыть
             </button>
             <button
               disabled={isSubmitting}
               className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
             >
               {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
               {editingInbound ? "Сохранить изменения" : "Создать подключение"}
             </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ActionBtn({ icon, color, tooltip, onClick }: any) {
  return (
    <button title={tooltip} onClick={onClick} className={`p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all ${color}`}>
      {icon}
    </button>
  );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input 
        type="checkbox" 
        className="hidden" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20 group-hover:border-white/40'}`}>
         {checked && <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <span className="text-sm font-semibold text-foreground tracking-wide">{label}</span>
    </label>
  );
}
