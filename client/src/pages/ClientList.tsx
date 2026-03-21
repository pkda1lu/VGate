import { 
  Plus, 
  Trash2, 
  RefreshCcw, 
  QrCode,
  Clock,
  Navigation,
  Mail,
  Loader2,
  AlertCircle,
  Users,
  Settings,
  Rss,
  Link2
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { getClients, deleteClient, createClient, updateClient, getInbounds, getSettings } from '../lib/api';
import Modal from '../components/Modal';
import Toggle from '../components/Toggle';

export default function ClientList() {
  const { data: clients, error, isLoading, mutate } = useSWR('/clients', () => getClients().then(res => res.data));
  const { data: inbounds } = useSWR('/inbounds', () => getInbounds().then(res => res.data));
  const { data: settings } = useSWR('/settings', () => getSettings().then(res => res.data));
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState({ link: '', sub: '' });

  const [formData, setFormData] = useState({
    inboundId: '',
    email: '',
    uuid: crypto.randomUUID() as string,
    flow: 'none',
    totalGb: 0,
    enabled: true,
    expiry: '',
    subId: '',
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({
      inboundId: inbounds?.[0]?.id || '',
      email: '',
      uuid: crypto.randomUUID(),
      flow: 'xtls-rprx-vision',
      totalGb: 0,
      enabled: true,
      expiry: '',
      subId: crypto.randomUUID(),
    });
    setShowModal(true);
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setFormData({
      inboundId: client.inboundId,
      email: client.email,
      uuid: client.uuid,
      flow: client.flow || 'none',
      totalGb: client.totalGb || 0,
      enabled: client.enabled,
      expiry: client.expiry ? new Date(client.expiry).toISOString().slice(0, 16) : '',
      subId: client.subId || crypto.randomUUID(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
      mutate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.inboundId) return alert('Select a proxy node first');
    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      setShowModal(false);
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySubLink = (client: any) => {
    const subId = client.subId || '';
    if (!subId) return alert('No subscription ID found for this client');
    
    const panelDomain = (settings?.server_ip) || window.location.hostname;
    const protocol = window.location.protocol;
    const subUrl = `${protocol}//${panelDomain}/api/sub/${subId}`;
    
    navigator.clipboard.writeText(subUrl);
    alert('Subscription link copied to clipboard!');
  };

  const getTrafficPercentage = (usage: number, limit: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const generateShareLink = (client: any) => {
    const inbound = inbounds?.find((i: any) => i.id === client.inboundId);
    if (!inbound) return '';

    // Use panel domain by default (window.location.hostname), 
    // but allow override if server_ip is specifically set in system settings.
    const host = (settings?.server_ip) || window.location.hostname;

    const port = inbound.port;
    const uuid = client.uuid;
    const tag = encodeURIComponent(client.email);

    const safeBase64 = (str: string) => {
        try {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) => String.fromCharCode(parseInt(p1, 16))));
        } catch (e) {
            return btoa(str);
        }
    };

    if (inbound.protocol === 'vless' || inbound.protocol === 'trojan') {
      let stream;
      try { stream = JSON.parse(inbound.stream); } catch(e) { stream = {}; }
      
      const security = stream.security || 'none';
      const type = stream.network || 'tcp';
      
      let url = `${inbound.protocol}://${uuid}@${host}:${port}?type=${type}&security=${security}&encryption=none`;

      if (type === 'xhttp') {
        const xpath = stream.xhttpSettings?.path || '/';
        const xhost = stream.xhttpSettings?.host || '';
        const xmode = stream.xhttpSettings?.mode || 'auto';
        url += `&path=${encodeURIComponent(xpath)}&mode=${xmode}`;
        if (xhost) url += `&host=${encodeURIComponent(xhost)}`;
      }

      if (security === 'reality') {
        const pbk = stream.realitySettings?.publicKey || '';
        const sni = stream.realitySettings?.serverNames?.[0] || '';
        const sid = stream.realitySettings?.shortIds?.[0] || '';
        const spx = stream.realitySettings?.spiderX || '/';
        const fp = 'chrome';
        const flow = client.flow && client.flow !== 'none' ? client.flow : (inbound.protocol === 'vless' ? 'xtls-rprx-vision' : '');
        url += `&pbk=${pbk}&sni=${sni}&fp=${fp}&sid=${sid}&spx=${encodeURIComponent(spx)}`;
        if (flow) url += `&flow=${flow}`;
      } else if (security === 'tls') {
        const sni = stream.tlsSettings?.serverName || host;
        url += `&sni=${sni}`;
      }

      url += `#${tag}`;
      return url;
    }

    if (inbound.protocol === 'vmess') {
        let stream;
        try { stream = JSON.parse(inbound.stream); } catch(e) { stream = {}; }
        const type = stream.network || 'tcp';
        const security = stream.security || 'none';

        const vmessObj = {
            v: "2",
            ps: client.email,
            add: host,
            port: port,
            id: uuid,
            aid: "0",
            scy: "auto",
            net: type,
            type: "none",
            host: "",
            path: "",
            tls: security === 'none' ? "" : security,
            sni: security === 'reality' ? (stream.realitySettings?.serverNames?.[0] || '') : (stream.tlsSettings?.serverName || ''),
            alpn: "",
            fp: security === 'reality' ? "chrome" : ""
        };

        if (type === 'xhttp') {
            vmessObj.path = stream.xhttpSettings?.path || '/';
            vmessObj.host = stream.xhttpSettings?.host || '';
        }

        return `vmess://${safeBase64(JSON.stringify(vmessObj))}`;
    }
    
    return `Unknown protocol: ${inbound.protocol}`;
  };

  const handleCopyLink = (client: any) => {
    const link = generateShareLink(client);
    if (link) {
      navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    }
  };

  const handleShowQr = (client: any) => {
    const link = generateShareLink(client);
    const subId = client.subId || '';
    
    // Correctly construct panel URL for sub
    const panelDomain = (settings?.server_ip) || window.location.host;
    const protocol = window.location.protocol;
    const subUrl = `${protocol}//${panelDomain}/api/sub/${subId}`;

    if (link) {
      setQrData({ link, sub: subUrl });
      setQrModalOpen(true);
    }
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
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-2xl font-semibold flex items-center gap-2 transition-all glow shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Create Client
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {clients?.map((client: any) => {
          const usageBytes = client.traffic?.total || 0;
          const limitBytes = (client.totalGb || 0) * (1024**3);
          const usageGB = (usageBytes / (1024**3)).toFixed(2);
          const pct = getTrafficPercentage(usageBytes, limitBytes);
          return (
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
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {client.expiry ? new Date(client.expiry).toLocaleDateString() : 'No expiry'}</span>
                </div>
             </div>

             <div className="flex flex-col gap-1 min-w-[200px]">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                   <span className="text-muted-foreground">Usage</span>
                   <span className="text-primary">{usageGB} / {client.totalGb ? `${client.totalGb} GB` : '∞'}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                   <div 
                      className={`h-full transition-all duration-1000 ${!client.enabled ? 'bg-red-400' : 'bg-primary'}`} 
                      style={{ width: `${pct}%` }}
                    />
                </div>
             </div>

             <div className="flex gap-2">
                <IconBtn onClick={() => handleCopyLink(client)} tooltip="Copy Node Link" icon={<Link2 className="w-4 h-4" />} />
                <IconBtn onClick={() => handleCopySubLink(client)} tooltip="Copy Subscription Link" icon={<Rss className="w-4 h-4 text-orange-400" />} color="hover:bg-orange-500/10" />
                <IconBtn onClick={() => handleShowQr(client)} tooltip="Show QR Code" icon={<QrCode className="w-4 h-4" />} />
                <IconBtn onClick={() => openEditModal(client)} tooltip="Edit Client" icon={<Settings className="w-4 h-4" />} color="text-sky-400 hover:bg-sky-500/10" />
                <IconBtn onClick={() => handleDelete(client.id)} tooltip="Delete User" icon={<Trash2 className="w-4 h-4" />} color="text-red-400 hover:bg-red-500/10" />
             </div>
          </div>
        )})}
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
        title={editingClient ? "Редактировать клиента" : "Создать подключение (Клиент)"}
        size="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Включить</label>
             <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 h-11 flex items-center">
                <Toggle checked={formData.enabled} onChange={(v) => setFormData({...formData, enabled: v})} />
             </div>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Parent Inbound</label>
             <div className="relative">
                <select
                  required
                  value={formData.inboundId}
                  onChange={(e) => setFormData({ ...formData, inboundId: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none"
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

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Email</label>
             <input
               required
               type="text"
               value={formData.email}
               onChange={(e) => setFormData({ ...formData, email: e.target.value })}
               placeholder="user@example.com"
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm"
             />
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">UUID (Xray ID)</label>
             <div className="relative flex items-center">
               <input
                 required
                 type="text"
                 value={formData.uuid}
                 onChange={(e) => setFormData({ ...formData, uuid: e.target.value })}
                 className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 pl-4 pr-12 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm font-mono text-muted-foreground"
               />
               <button type="button" onClick={() => setFormData({...formData, uuid: crypto.randomUUID()})} className="absolute right-3 p-1 hover:text-primary transition-colors text-muted-foreground">
                  <RefreshCcw className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Subscription ID</label>
             <div className="relative flex items-center">
               <input
                 required
                 type="text"
                 value={formData.subId}
                 onChange={(e) => setFormData({ ...formData, subId: e.target.value })}
                 className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 pl-4 pr-12 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.05] transition-all text-sm font-mono text-muted-foreground"
               />
               <button type="button" onClick={() => setFormData({...formData, subId: crypto.randomUUID()})} className="absolute right-3 p-1 hover:text-orange-500 transition-colors text-muted-foreground">
                  <RefreshCcw className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <label className="text-sm font-semibold text-right text-muted-foreground group-focus-within:text-foreground">Flow</label>
             <select
               value={formData.flow}
               onChange={(e) => setFormData({ ...formData, flow: e.target.value })}
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm appearance-none"
             >
               <option value="none" className="bg-background">none</option>
               <option value="xtls-rprx-vision" className="bg-background">xtls-rprx-vision</option>
               <option value="xtls-rprx-vision-udp443" className="bg-background">xtls-rprx-vision-udp443</option>
             </select>
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <div className="flex items-center justify-end gap-1.5 text-muted-foreground group-focus-within:text-foreground">
                <label className="text-sm font-semibold">Общий расход</label>
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">?</div>
             </div>
             <input
               type="number"
               value={formData.totalGb}
               onChange={(e) => setFormData({ ...formData, totalGb: parseFloat(e.target.value) })}
               placeholder="0"
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm"
             />
          </div>

          <div className="grid grid-cols-[160px_1fr] items-center gap-4 group">
             <div className="flex items-center justify-end gap-1.5 text-muted-foreground group-focus-within:text-foreground">
                <label className="text-sm font-semibold">Дата окончания</label>
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">?</div>
             </div>
             <input
               type="datetime-local"
               value={formData.expiry}
               onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
               className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-11 px-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all text-sm [color-scheme:dark]"
             />
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
               {editingClient ? "Сохранить изменения" : "Создать"}
             </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Client Connection QR" size="2xl">
        <div className="flex flex-col md:flex-row gap-8 p-8 items-start justify-center">
           {/* Direct Link QR */}
           <div className="flex-1 flex flex-col items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-primary">Direct Node Link</span>
              <div className="bg-white p-3 rounded-2xl shadow-xl">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.link)}`} 
                   alt="Direct QR"
                   className="w-[180px] h-[180px]"
                 />
              </div>
              <input 
                type="text" 
                readOnly 
                value={qrData.link} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-muted-foreground focus:outline-none truncate"
              />
              <button 
                onClick={() => { navigator.clipboard.writeText(qrData.link); alert('Node link copied!'); }}
                className="w-full bg-white/5 hover:bg-white/10 text-foreground font-bold py-2.5 rounded-xl transition-all text-sm border border-white/5"
              >
                Copy Direct Link
              </button>
           </div>

           <div className="w-px h-64 bg-white/5 hidden md:block self-center" />

           {/* Subscription Link QR */}
           <div className="flex-1 flex flex-col items-center gap-4">
              <span className="text-xs font-black uppercase tracking-widest text-orange-400">Subscription URL</span>
              <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-orange-500/20">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData.sub)}`} 
                   alt="Sub QR"
                   className="w-[180px] h-[180px]"
                 />
              </div>
              <input 
                type="text" 
                readOnly 
                value={qrData.sub} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-muted-foreground focus:outline-none truncate"
              />
              <button 
                onClick={() => { navigator.clipboard.writeText(qrData.sub); alert('Sub link copied!'); }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20"
              >
                Copy Sub URL
              </button>
           </div>
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({ icon, color, tooltip, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all ${color || 'text-primary'}`} 
      title={tooltip}
    >
      {icon}
    </button>
  );
}
