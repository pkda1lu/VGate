import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Shield, 
  Globe, 
  Terminal,
  Cpu,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Network,
  Share2,
  Info,
  Layers,
  Zap,
  ChevronDown,
  Hash,
  Plus,
  Trash2,
  Code
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getSettings, updateSettings, restartXray } from '../lib/api';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'system' | 'general' | 'routing' | 'dns' | 'outbounds' | 'advanced';

export default function Settings() {
  const { data: settings, mutate, isLoading } = useSWR('/settings', () => getSettings().then(res => res.data));
  const [activeTab, setActiveTab] = useState<TabType>('system');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await updateSettings(formData);
      await mutate();
      setMessage({ type: 'success', text: 'Configuration updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    setMessage(null);
    try {
      await restartXray();
      setMessage({ type: 'success', text: 'Xray core restarted successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to restart Xray' });
    } finally {
      setIsRestarting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Loading core environment...</p>
    </div>
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'system', label: 'System', icon: <Cpu className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Info className="w-4 h-4" /> },
    { id: 'routing', label: 'Routing', icon: <Network className="w-4 h-4" /> },
    { id: 'dns', label: 'DNS', icon: <Globe className="w-4 h-4" /> },
    { id: 'outbounds', label: 'Outbounds', icon: <Share2 className="w-4 h-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Code className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-in mt-[-1rem] duration-500 max-w-6xl mx-auto pb-24">
      <header className="flex justify-between items-center glass p-6 rounded-[2rem] border border-white/5 sticky top-4 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary shadow-[0_0_20px_rgba(139,92,246,0.15)]">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tight">Xray Environment</h1>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">Core Version: 1.8.4</p>
            </div>
        </div>
        
        <div className="flex gap-3">
            <button
                type="button"
                onClick={handleRestart}
                disabled={isRestarting}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 px-6 font-bold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
            >
                {isRestarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Sync & Restart
            </button>
            <button
                onClick={() => handleSave()}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all glow shadow-primary/20 active:scale-[0.98] disabled:opacity-70 text-sm"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes
            </button>
        </div>
      </header>

      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-3xl w-fit mx-auto mt-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-[20px] text-sm font-black uppercase tracking-widest transition-all
              ${activeTab === tab.id 
                ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' 
                : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'system' && (
              <SystemSettings formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'general' && (
              <XrayGeneralTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'routing' && (
              <RoutingTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'dns' && (
              <DnsTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'outbounds' && (
              <OutboundsTab formData={formData} setFormData={setFormData} />
            )}

            {activeTab === 'advanced' && (
              <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
                 <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                 <SectionTitle icon={<Code className="w-4 h-4" />} title="Raw Configuration" subtitle="Edit raw settings for all core modules" />
                 <div className="space-y-6">
                    <JsonEditor 
                        label="Log Config"
                        value={formData.xray_config_log || ''}
                        onChange={(v: string) => setFormData({ ...formData, x_log: v })}
                    />
                    <JsonEditor 
                        label="Policy Config"
                        value={formData.xray_config_policy || ''}
                        onChange={(v: string) => setFormData({ ...formData, x_policy: v })}
                    />
                    <JsonEditor 
                        label="Routing Config"
                        value={formData.xray_config_routing || ''}
                        onChange={(v: string) => setFormData({ ...formData, x_routing: v })}
                    />
                 </div>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Specific Tabs ---

function DnsTab({ formData, setFormData }: any) {
    const dnsObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_dns || '{"servers":["1.1.1.1"]}'); } catch { return { servers: ["1.1.1.1"] }; }
    }, [formData.xray_config_dns]);

    const updateDns = (update: any) => {
        setFormData((prev: any) => ({ ...prev, xray_config_dns: JSON.stringify({ ...dnsObj, ...update }) }));
    };

    return (
        <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-10 glow relative overflow-hidden">
            <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
            <SectionTitle icon={<Globe className="w-4 h-4" />} title="DNS Infrastructure" subtitle="Configure how the core resolves human-readable addresses" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-b border-white/5 pb-10">
                <ToggleInput 
                    label="Enable Internal Resolver" 
                    description="Activates the built-in DNS service within Xray"
                    value={dnsObj.enabled !== false} // default true in our UI sense
                    onChange={(v) => updateDns({ enabled: v })}
                />
                <SettingInput 
                    label="Client IP Override" 
                    description="Used to inform DNS servers of client's relative location (ECS)"
                    value={dnsObj.clientIp || ''} 
                    onChange={(v: string) => updateDns({ clientIp: v })} 
                    placeholder="1.2.3.4" 
                />
                <SelectInput 
                    label="Query Strategy" 
                    value={dnsObj.queryStrategy || 'UseIP'}
                    options={[
                        { label: 'UseIP (Mixed)', value: 'UseIP' },
                        { label: 'UseIPv4', value: 'UseIPv4' },
                        { label: 'UseIPv6', value: 'UseIPv6' }
                    ]}
                    onChange={(v) => updateDns({ queryStrategy: v })}
                />
                <ToggleInput 
                    label="Disable Cache" 
                    description="Bypass DNS caching for all query resolutions"
                    value={dnsObj.disableCache === true}
                    onChange={(v) => updateDns({ disableCache: v })}
                />
                <ToggleInput 
                    label="System Hosts Interaction" 
                    description="Allow Xray to utilize the OS /etc/hosts file entries"
                    value={dnsObj.useSystemHosts !== false}
                    onChange={(v) => updateDns({ useSystemHosts: v })}
                />
            </div>

            <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Upstream DNS Servers</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(dnsObj.servers || []).map((s: any, idx: number) => (
                        <div key={idx} className="flex gap-2">
                             <input
                                value={typeof s === 'string' ? s : s.address}
                                onChange={(e) => {
                                    const newServers = [...dnsObj.servers];
                                    if (typeof s === 'string') newServers[idx] = e.target.value;
                                    else newServers[idx] = { ...s, address: e.target.value };
                                    updateDns({ servers: newServers });
                                }}
                                className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:border-primary/50 text-sm font-mono"
                            />
                            <button 
                                onClick={() => {
                                    updateDns({ servers: dnsObj.servers.filter((_: any, i: number) => i !== idx) });
                                }}
                                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button 
                         onClick={() => updateDns({ servers: [...(dnsObj.servers || []), "8.8.8.8"] })}
                         className="flex items-center justify-center gap-2 border-2 border-dashed border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary py-3 rounded-2xl transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Server
                    </button>
                </div>
            </div>
        </section>
    );
}

function RoutingTab({ formData, setFormData }: any) {
    const routingObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_routing || '{"rules":[]}'); } catch { return { rules: [] }; }
    }, [formData.xray_config_routing]);

    return (
        <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow">
             <SectionTitle icon={<Network className="w-4 h-4" />} title="Traffic Orchestration" subtitle="Define how the core handles complex routing scenarios" />
             
             <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-3xl border border-white/5">
                <div className="flex gap-4">
                    <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20">
                        {routingObj.rules?.length || 0} Domain Rules
                    </span>
                    <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
                        Strategy: {routingObj.domainStrategy || 'AsIs'}
                    </span>
                </div>
                <button className="flex items-center gap-2 bg-primary px-6 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all">
                    <Plus className="w-4 h-4" /> Create Rule
                </button>
             </div>

             <div className="overflow-x-auto rounded-[2rem] border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        <tr>
                            <th className="p-5">#</th>
                            <th className="p-5">Destination (IP/Domain)</th>
                            <th className="p-5">Inbound Tag</th>
                            <th className="p-5">Target Outbound</th>
                            <th className="p-5">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {(routingObj.rules || []).map((rule: any, idx: number) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="p-5 text-xs text-muted-foreground">{idx + 1}</td>
                                <td className="p-5">
                                    <div className="flex flex-wrap gap-1">
                                        {(rule.domain || []).map((d: string) => <span key={d} className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded-md text-[10px] border border-sky-500/20">{d}</span>)}
                                        {(rule.ip || []).map((i: string) => <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] border border-emerald-500/20">{i}</span>)}
                                        {!(rule.domain || rule.ip) && <span className="text-muted-foreground text-[10px italic]">Any (Default)</span>}
                                    </div>
                                </td>
                                <td className="p-5 text-sm font-mono text-white/70">{rule.inboundTag?.join(', ') || '*'}</td>
                                <td className="p-5 uppercase tracking-widest text-[10px] font-black">
                                    <span className={`px-3 py-1 rounded-lg border ${rule.outboundTag === 'blocked' ? 'border-red-500/30 text-red-400 bg-red-500/5' : 'border-primary/30 text-primary bg-primary/5'}`}>
                                        {rule.outboundTag}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <button className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             
             <div className="pt-4">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Advanced Rules JSON</label>
                <JsonEditor 
                    value={formData.xray_config_routing || ''}
                    onChange={(v: string) => setFormData({ ...formData, xray_config_routing: v })}
                    height="h-[250px]"
                />
             </div>
        </section>
    );
}

function OutboundsTab({ formData }: any) {
    const outboundsObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_outbounds || '[]'); } catch { return []; }
    }, [formData.xray_config_outbounds]);

    return (
        <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow">
             <SectionTitle icon={<Share2 className="w-4 h-4" />} title="Exit Points" subtitle="Configure where traffic flows after processing (direct, block, or proxy)" />
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outboundsObj.map((ob: any, idx: number) => (
                    <div key={idx} className="glass p-6 rounded-[2rem] border border-white/5 relative group hover:border-primary/40 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${ob.tag === 'blocked' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                {ob.protocol === 'freedom' ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-muted-foreground hover:text-white transition-colors"><SettingsIcon className="w-4 h-4" /></button>
                                {ob.tag !== 'direct' && ob.tag !== 'blocked' && (
                                    <button className="p-2 text-red-500/60 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                )}
                            </div>
                        </div>
                        <h3 className="font-black uppercase tracking-[0.1em] text-sm text-white/90">{ob.tag}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">Protocol: {ob.protocol}</p>
                        
                        <div className="flex items-center gap-2 mt-auto">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Active Endpoint</span>
                        </div>
                    </div>
                ))}
                <button className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/10 rounded-[2rem] hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                    <Plus className="w-8 h-8" />
                    <span className="font-bold text-xs uppercase tracking-widest">Add Connection</span>
                </button>
             </div>

             <div className="pt-10 border-t border-white/5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Quick Warp Creation</label>
                <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-white">Generate Cloudflare WARP</p>
                            <p className="text-xs text-blue-400/80">Creates a secure outbound bridge for unblocking resources</p>
                        </div>
                    </div>
                    <button className="bg-blue-500 hover:bg-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">Generate Now</button>
                </div>
             </div>
        </section>
    );
}

function SectionTitle({ icon, title, subtitle }: { icon: any, title: string, subtitle?: string }) {
    return (
        <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/[0.03] text-primary border border-white/5 shadow-inner">
                    {icon}
                </div>
                <h2 className="text-xl font-black tracking-tight">{title}</h2>
            </div>
            {subtitle && <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{subtitle}</p>}
        </div>
    );
}

function SystemSettings({ formData, setFormData }: any) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
                    <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                    <SectionTitle icon={<Layers className="w-4 h-4" />} title="Server Paths" subtitle="Low-level environment variables" />
                    <div className="space-y-6">
                        <SettingInput
                            label="Xray Executable"
                            icon={<Terminal className="w-4 h-4" />}
                            value={formData.xray_binary || ''}
                            onChange={(v: string) => setFormData({ ...formData, xray_binary: v })}
                            placeholder="/usr/local/bin/xray"
                        />
                        <SettingInput
                            label="Json Deployment"
                            icon={<Database className="w-4 h-4" />}
                            value={formData.xray_config_path || ''}
                            onChange={(v: string) => setFormData({ ...formData, xray_config_path: v })}
                            placeholder="/etc/vgate/xray_config.json"
                        />
                        <SettingInput
                            label="Listen Port"
                            type="number"
                            icon={<Hash className="w-4 h-4" />}
                            value={formData.panel_port || '4000'}
                            onChange={(v: string) => setFormData({ ...formData, panel_port: v })}
                        />
                        <SettingInput
                            label="Server IP / Domain (для клиентских ссылок)"
                            description="IP или домен VPS — используется в ссылках для клиентов. Не домен панели!"
                            icon={<Globe className="w-4 h-4" />}
                            value={formData.server_ip || ''}
                            onChange={(v: string) => setFormData({ ...formData, server_ip: v })}
                            placeholder="84.54.31.161"
                        />
                    </div>
                </section>

                <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
                    <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                    <SectionTitle icon={<Zap className="w-4 h-4" />} title="Communication" subtitle="Integrate external notification channels" />
                    <div className="space-y-6">
                        <SettingInput
                            label="TG Bot API"
                            value={formData.telegram_token || ''}
                            onChange={(v: string) => setFormData({ ...formData, telegram_token: v })}
                            placeholder="123456789:ABC..."
                        />
                        <SettingInput
                            label="Management ID"
                            value={formData.telegram_chat_id || ''}
                            onChange={(v: string) => setFormData({ ...formData, telegram_chat_id: v })}
                            placeholder="123456789"
                        />
                    </div>
                </section>
            </div>

            <SslSetupSection />
        </div>
    );
}

import { setupSsl } from '../lib/api';

function SslSetupSection() {
    const [domain, setDomain] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; log: string } | null>(null);

    const handleSetup = async () => {
        if (!domain || !email) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await setupSsl({ domain, email });
            setResult(res.data);
        } catch (err: any) {
            setResult({ success: false, log: err.response?.data?.error || err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
             <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
             <SectionTitle icon={<Shield className="w-4 h-4" />} title="Automatic SSL" subtitle="Generate Let's Encrypt certificates using Certbot" />
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <SettingInput 
                        label="Domain Name" 
                        description="Point your A record to this server IP first"
                        value={domain} 
                        onChange={setDomain} 
                        placeholder="vgate.example.com" 
                    />
                    <SettingInput 
                        label="Contact Email" 
                        description="Required for Let's Encrypt notifications"
                        value={email} 
                        onChange={setEmail} 
                        placeholder="admin@example.com" 
                    />
                    <button 
                        onClick={handleSetup}
                        disabled={loading || !domain || !email}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        Initialize Auto-SSL
                    </button>
                 </div>

                 <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Execution Log</label>
                    <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6 h-[200px] overflow-y-auto font-mono text-[10px] whitespace-pre-wrap text-white/60 leading-relaxed">
                        {result ? (
                            <div className={result.success ? 'text-emerald-400' : 'text-red-400'}>
                                {result.log}
                                {result.success && "\n\n[SUCCESS] Certificates installed to /etc/letsencrypt/live/"}
                            </div>
                        ) : (
                            <span className="opacity-30 italic">Waiting for execution...</span>
                        )}
                    </div>
                 </div>
             </div>
        </section>
    );
}

function XrayGeneralTab({ formData, setFormData }: any) {
    const logObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_log || '{}'); } catch { return {}; }
    }, [formData.xray_config_log]);

    const policyObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_policy || '{}'); } catch { return {}; }
    }, [formData.xray_config_policy]);

    const routingObj = useMemo(() => {
        try { return JSON.parse(formData.xray_config_routing || '{}'); } catch { return {}; }
    }, [formData.xray_config_routing]);

    const updateLog = (update: any) => {
        const newVal = JSON.stringify({ ...logObj, ...update });
        setFormData((prev: any) => ({ ...prev, xray_config_log: newVal }));
    };

    const updatePolicy = (update: any) => {
        const newVal = { 
            levels: { ...(policyObj.levels || {}) },
            system: { ...(policyObj.system || {}) },
            ...update 
        };
        if (update.system) newVal.system = { ...newVal.system, ...update.system };
        if (update.levels) newVal.levels["0"] = { ...(newVal.levels["0"] || {}), ...update.levels["0"] };
        setFormData((prev: any) => ({ ...prev, xray_config_policy: JSON.stringify(newVal) }));
    };

    const updateRouting = (update: any) => {
        setFormData((prev: any) => ({ ...prev, xray_config_routing: JSON.stringify({ ...routingObj, ...update }) }));
    };

    return (
        <div className="space-y-8">
            <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
                <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                <SectionTitle icon={<Info className="w-4 h-4" />} title="Core Parameters" subtitle="Core execution strategies and feedback" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SelectInput 
                        label="Domain Resolution" 
                        value={routingObj.domainStrategy || 'AsIs'}
                        options={[
                            { label: 'AsIs (Fastest)', value: 'AsIs' },
                            { label: 'IPIfNonMatch', value: 'IPIfNonMatch' },
                            { label: 'IPOnDemand', value: 'IPOnDemand' }
                        ]}
                        onChange={(v) => updateRouting({ domainStrategy: v })}
                    />
                    <SelectInput 
                        label="Log verbosity" 
                        value={logObj.loglevel || 'warning'}
                        options={[
                            { label: 'Debug (Verbose)', value: 'debug' },
                            { label: 'Info', value: 'info' },
                            { label: 'Warning (Default)', value: 'warning' },
                            { label: 'Error (Only errors)', value: 'error' },
                            { label: 'None (Silent)', value: 'none' }
                        ]}
                        onChange={(v) => updateLog({ loglevel: v })}
                    />
                </div>
            </section>

            <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-10 glow relative overflow-hidden">
                <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                <SectionTitle icon={<Hash className="w-4 h-4" />} title="System Metrics" subtitle="Control which traffic flows are tracked in real-time" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8 border-white/5">
                    <ToggleInput 
                        label="Global Uplink Monitoring" 
                        description="Track total outgoing traffic through the core engine"
                        value={policyObj.system?.statsInboundUplink}
                        onChange={(v) => updatePolicy({ system: { statsInboundUplink: v } })}
                    />
                    <ToggleInput 
                        label="Global Downlink Monitoring" 
                        description="Track total incoming traffic through the core engine"
                        value={policyObj.system?.statsInboundDownlink}
                        onChange={(v) => updatePolicy({ system: { statsInboundDownlink: v } })}
                    />
                    <ToggleInput 
                        label="User Upload Visibility" 
                        description="Monitor individual client data consumption for uploads"
                        value={policyObj.levels?.["0"]?.statsUserUplink}
                        onChange={(v) => updatePolicy({ levels: { "0": { statsUserUplink: v } } })}
                    />
                    <ToggleInput 
                        label="User Download Visibility" 
                        description="Monitor individual client data consumption for downloads"
                        value={policyObj.levels?.["0"]?.statsUserDownlink}
                        onChange={(v) => updatePolicy({ levels: { "0": { statsUserDownlink: v } } })}
                    />
                </div>
            </section>

             <section className="glass p-10 rounded-[3rem] border border-white/5 space-y-8 glow relative overflow-hidden">
                <div className="shimmer absolute inset-0 opacity-5 pointer-events-none" />
                <SectionTitle icon={<Terminal className="w-4 h-4" />} title="Access Protection" subtitle="Security policies and access control switches" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                    <ToggleInput 
                        label="Restrict BitTorrent" 
                        description="Block all P2P/Torrent-related protocols and patterns"
                        value={formData.block_bittorrent === 'true'}
                        onChange={(v) => setFormData({ ...formData, block_bittorrent: v ? 'true' : 'false' })}
                    />
                    <ToggleInput 
                        label="Isolate Private Networks" 
                        description="Deny traffic to secure LAN and internal IP ranges"
                        value={formData.block_private_ips === 'true'}
                        onChange={(v) => setFormData({ ...formData, block_private_ips: v ? 'true' : 'false' })}
                    />
                    <ToggleInput 
                        label="Filter Ad-Ware" 
                        description="Block known advertising and tracking network domains"
                        value={formData.block_ads === 'true'}
                        onChange={(v) => setFormData({ ...formData, block_ads: v ? 'true' : 'false' })}
                    />
                </div>
            </section>
        </div>
    );
}

// --- Atoms ---

function ToggleInput({ label, description, value, onChange }: { label: string, description: string, value: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-2 group">
            <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-tight text-white/90 group-hover:text-primary transition-colors">{label}</p>
                <p className="text-[10px] text-muted-foreground max-w-[280px] leading-relaxed font-bold">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`
                    w-14 h-7 rounded-full transition-all relative border-2
                    ${value ? 'bg-primary border-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/10'}
                `}
            >
                <div className={`
                    absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300
                    ${value ? 'translate-x-7 scale-110 shadow-lg' : 'translate-x-0 scale-100'}
                `} />
            </button>
        </div>
    );
}

function SelectInput({ label, value, options, onChange }: { label: string, value: string, options: { label: string, value: string }[], onChange: (v: string) => void }) {
    return (
        <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">{label}</label>
            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-[20px] py-4 px-5 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all font-bold text-sm appearance-none cursor-pointer"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-[#0c0c0e] text-white py-3">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground group-hover:text-primary transition-colors">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}

function SettingInput({ label, value, onChange, placeholder, type = "text", icon, description }: any) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-0.5 ml-1">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
          {description && <p className="text-[9px] text-muted-foreground/60 font-bold uppercase">{description}</p>}
      </div>
      <div className="relative group">
        {icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/[0.04] border border-white/10 rounded-[20px] py-4 ${icon ? 'pl-14' : 'px-5'} pr-5 focus:outline-none focus:border-primary/50 focus:bg-white/[0.08] transition-all font-bold text-sm placeholder:text-muted-foreground/30`}
        />
      </div>
    </div>
  );
}

function JsonEditor({ label, value, onChange, height = "h-[200px]" }: any) {
    const [isValid, setIsValid] = useState(true);
    const handleChange = (val: string) => {
        onChange(val);
        try { JSON.parse(val); setIsValid(true); } catch { setIsValid(false); }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
                {label && <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</label>}
                {!isValid && <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter animate-pulse">Syntax Error</span>}
            </div>
            <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                className={`
                    w-full bg-white/[0.02] border font-mono text-xs p-6 rounded-[2rem] focus:outline-none transition-all leading-relaxed
                    ${isValid ? 'border-white/10 focus:border-primary/40' : 'border-red-500/40 focus:border-red-500'}
                    ${height}
                `}
            />
        </div>
    );
}
