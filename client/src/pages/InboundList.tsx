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
    network: 'tcp',
    security: 'reality',

    realityDest: 'google.com:443',
    realityServerNames: 'google.com, www.google.com',
    realityPrivateKey: '',
    realityPublicKey: '',
    realityShortIds: '',

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
      network: 'tcp',
      security: 'reality',
      realityDest: 'google.com:443',
      realityServerNames: 'google.com, www.google.com',
      realityPrivateKey: '',
      realityPublicKey: '',
      realityShortIds: '',
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
    let stream;
    try { sniffEnv = JSON.parse(inb.sniffing); } catch(e) { sniffEnv = { enabled: true, destOverride: ["http", "tls"] }; }
    try { stream = JSON.parse(inb.stream); } catch(e) { stream = { network: 'tcp', security: 'none' }; }

    const rs = stream.realitySettings || {};

    setFormData({
      tag: inb.tag,
      port: inb.port,
      protocol: inb.protocol,
      network: stream.network || 'tcp',
      security: stream.security || 'none',

      realityDest: rs.dest || 'google.com:443',
      realityServerNames: Array.isArray(rs.serverNames) ? rs.serverNames.join(', ') : 'google.com',
      realityPrivateKey: rs.privateKey || '',
      realityPublicKey: rs.publicKey || '',
      realityShortIds: Array.isArray(rs.shortIds) ? rs.shortIds.join(', ') : '',

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
      stream: {
        network: formData.network,
        security: formData.security,
        realitySettings: formData.security === 'reality' ? {
          show: false,
          dest: formData.realityDest,
          xver: 0,
          serverNames: formData.realityServerNames.split(',').map(s => s.trim()).filter(Boolean),
          privateKey: formData.realityPrivateKey,
          publicKey: formData.realityPublicKey,
          minClientVer: "",
          maxClientVer: "",
          maxTimeDiff: 0,
          shortIds: formData.realityShortIds.split(',').map(s => s.trim()).filter(Boolean)
        } : undefined
      },
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
        size="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b border-primary/20 pb-2 mb-4">Основные</h3>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Примечание (Tag)</label>
                <input
                  required
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="e.g. vless-reality-main"
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm block"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Протокол</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none block"
                  >
                    <option value="vless" className="bg-background">VLESS</option>
                    <option value="vmess" className="bg-background">VMess</option>
                    <option value="trojan" className="bg-background">Trojan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Порт</label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm block"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Сеть (Network)</label>
                  <select
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none block"
                  >
                    <option value="tcp" className="bg-background">TCP</option>
                    <option value="ws" className="bg-background">WebSocket (ws)</option>
                    <option value="grpc" className="bg-background">gRPC</option>
                    <option value="httpupgrade" className="bg-background">HTTPUpgrade</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Шифрование</label>
                  <select
                    value={formData.security}
                    onChange={(e) => setFormData({ ...formData, security: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none block"
                  >
                    <option value="none" className="bg-background">Пусто (None)</option>
                    <option value="tls" className="bg-background">TLS</option>
                    <option value="reality" className="bg-background">Reality</option>
                  </select>
                </div>
              </div>
              
              <div className="border border-white/5 bg-white/[0.01] rounded-2xl mt-4 overflow-hidden transition-all">
                <button 
                  type="button" 
                  onClick={() => setSniffingOpen(!sniffingOpen)}
                  className="w-full p-4 flex items-center gap-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  {sniffingOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-semibold text-sm">Настройки Sniffing</span>
                </button>
                {sniffingOpen && (
                  <div className="p-4 space-y-4">
                    <Toggle checked={formData.sniffingEnabled} onChange={(v) => setFormData({...formData, sniffingEnabled: v})} label="Включить Sniffing" />
                    <div className="flex flex-wrap gap-4 items-center">
                      <Checkbox label="HTTP" checked={formData.sniffHttp} onChange={(v) => setFormData({...formData, sniffHttp: v})} />
                      <Checkbox label="TLS" checked={formData.sniffTls} onChange={(v) => setFormData({...formData, sniffTls: v})} />
                      <Checkbox label="QUIC" checked={formData.sniffQuic} onChange={(v) => setFormData({...formData, sniffQuic: v})} />
                      <Checkbox label="FAKEDNS" checked={formData.sniffFakedns} onChange={(v) => setFormData({...formData, sniffFakedns: v})} />
                    </div>
                    <div className="flex gap-4 pt-2 border-t border-white/5">
                      <Toggle checked={formData.metadataOnly} onChange={(v) => setFormData({...formData, metadataOnly: v})} label="Metadata Only" />
                      <Toggle checked={formData.routeOnly} onChange={(v) => setFormData({...formData, routeOnly: v})} label="Route Only" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Advanced Reality or TLS */}
            <div className="space-y-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5 relative">
               <h3 className="text-sm font-black uppercase tracking-widest text-[#38bdf8] border-b border-[#38bdf8]/20 pb-2 mb-4">Security: {formData.security}</h3>
               
               {formData.security === 'none' && (
                  <div className="flex items-center justify-center p-8 opacity-50">
                     <p className="text-sm font-semibold text-center italic">No additional security layers required for this configuration.</p>
                  </div>
               )}

               {formData.security === 'reality' && (
                 <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dest (Реальный хост)</label>
                      <input
                        value={formData.realityDest}
                        onChange={(e) => setFormData({ ...formData, realityDest: e.target.value })}
                        placeholder="e.g. google.com:443"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all text-sm block"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SNI (Server Names)</label>
                      <input
                        value={formData.realityServerNames}
                        onChange={(e) => setFormData({ ...formData, realityServerNames: e.target.value })}
                        placeholder="google.com, www.google.com"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all text-sm block"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                         Private Key 
                         {!formData.realityPrivateKey && editingInbound && <span className="text-amber-500 lowercase normal-case">(Hidden - Auto config only)</span>}
                      </label>
                      <input
                        value={formData.realityPrivateKey}
                        onChange={(e) => setFormData({ ...formData, realityPrivateKey: e.target.value })}
                        placeholder="Paste auto-generated key or leave empty"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all text-sm font-mono block opacity-80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                         Public Key
                      </label>
                      <input
                        value={formData.realityPublicKey}
                        onChange={(e) => setFormData({ ...formData, realityPublicKey: e.target.value })}
                        placeholder="Paste public key or leave empty"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all text-sm font-mono block opacity-80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Short IDs</label>
                      <input
                        value={formData.realityShortIds}
                        onChange={(e) => setFormData({ ...formData, realityShortIds: e.target.value })}
                        placeholder="Comma separated hex strings"
                        className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-[#38bdf8]/50 focus:bg-white/[0.05] transition-all text-sm font-mono block"
                      />
                    </div>
                 </div>
               )}

               {formData.security === 'tls' && (
                 <div className="space-y-4 animate-in fade-in">
                    <p className="text-sm font-medium text-muted-foreground">TLS Certificates and ACME paths will be managed globally. Specific inbound SNIs can be placed here over time.</p>
                 </div>
               )}
            </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end items-center border-t border-white/5 mt-8 relative z-10 bg-background/80 backdrop-blur-md sticky bottom-0">
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
