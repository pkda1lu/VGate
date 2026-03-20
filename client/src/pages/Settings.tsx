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
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings, restartXray } from '../lib/api';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'system' | 'general' | 'routing' | 'outbounds' | 'dns';

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await updateSettings(formData);
      await mutate();
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
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
      setMessage({ type: 'error', text: 'Failed to restart Xray core' });
    } finally {
      setIsRestarting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Loading system configuration...</p>
    </div>
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'system', label: 'System', icon: <Cpu className="w-4 h-4" /> },
    { id: 'general', label: 'General', icon: <Info className="w-4 h-4" /> },
    { id: 'routing', label: 'Routing', icon: <Network className="w-4 h-4" /> },
    { id: 'dns', label: 'DNS', icon: <Globe className="w-4 h-4" /> },
    { id: 'outbounds', label: 'Outbounds', icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500 max-w-6xl mx-auto pb-20">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary glow shadow-primary/5">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Panel Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2">Manage panel behavior and Xray core configuration</p>
        </div>
        
        <div className="flex gap-4">
            <button
                type="button"
                onClick={handleRestart}
                disabled={isRestarting}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 px-6 font-bold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {isRestarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Restart Core
            </button>
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all glow shadow-primary/20 active:scale-[0.98] disabled:opacity-70"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save All
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
      <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'system' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                  <SectionTitle icon={<Layers className="w-4 h-4" />} title="Paths & Binaries" />
                  <SettingInput
                    label="Xray Binary"
                    icon={<Terminal className="w-4 h-4" />}
                    value={formData.xray_binary || ''}
                    onChange={(v) => setFormData({ ...formData, xray_binary: v })}
                    placeholder="/usr/local/bin/xray"
                  />
                  <SettingInput
                    label="Config Path"
                    icon={<Database className="w-4 h-4" />}
                    value={formData.xray_config_path || ''}
                    onChange={(v) => setFormData({ ...formData, xray_config_path: v })}
                    placeholder="/etc/vgate/xray_config.json"
                  />
                  <SettingInput
                    label="Panel Port"
                    type="number"
                    icon={<Shield className="w-4 h-4" />}
                    value={formData.panel_port || '4000'}
                    onChange={(v) => setFormData({ ...formData, panel_port: v })}
                  />
                </section>

                <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                   <SectionTitle icon={<Zap className="w-4 h-4" />} title="Notifications" />
                   <SettingInput
                    label="Telegram Bot Token"
                    value={formData.telegram_token || ''}
                    onChange={(v) => setFormData({ ...formData, telegram_token: v })}
                    placeholder="123456789:ABC..."
                  />
                  <SettingInput
                    label="Telegram Chat ID"
                    value={formData.telegram_chat_id || ''}
                    onChange={(v) => setFormData({ ...formData, telegram_chat_id: v })}
                    placeholder="123456789"
                  />
                </section>
              </div>
            )}

            {activeTab === 'general' && (
              <div className="space-y-6">
                <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                  <SectionTitle icon={<Info className="w-4 h-4" />} title="Core Configuration" />
                  <JsonEditor 
                    label="Logging"
                    value={formData.xray_config_log || ''}
                    onChange={(v: string) => setFormData({ ...formData, xray_config_log: v })}
                  />
                  <JsonEditor 
                    label="Policy (User Levels & Stats)"
                    value={formData.xray_config_policy || ''}
                    onChange={(v: string) => setFormData({ ...formData, xray_config_policy: v })}
                  />
                </section>
              </div>
            )}

            {activeTab === 'routing' && (
              <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                <SectionTitle icon={<Network className="w-4 h-4" />} title="Global Routing" />
                <JsonEditor 
                  label="Routing Rules & Strategy"
                  value={formData.xray_config_routing || ''}
                  onChange={(v: string) => setFormData({ ...formData, xray_config_routing: v })}
                  height="h-[400px]"
                />
              </section>
            )}

            {activeTab === 'dns' && (
              <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                <SectionTitle icon={<Globe className="w-4 h-4" />} title="DNS Settings" />
                <JsonEditor 
                  label="DNS Configuration"
                  value={formData.xray_config_dns || ''}
                  onChange={(v: string) => setFormData({ ...formData, xray_config_dns: v })}
                />
              </section>
            )}

            {activeTab === 'outbounds' && (
              <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
                <SectionTitle icon={<Share2 className="w-4 h-4" />} title="Outbound Detours" />
                <JsonEditor 
                  label="Outbounds List"
                  value={formData.xray_config_outbounds || ''}
                  onChange={(v: string) => setFormData({ ...formData, xray_config_outbounds: v })}
                  height="h-[300px]"
                />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                {icon}
            </div>
            <h2 className="text-lg font-bold">{title}</h2>
        </div>
    );
}

function JsonEditor({ label, value, onChange, height = "h-[200px]" }: any) {
    const [isValid, setIsValid] = useState(true);
    
    const handleChange = (val: string) => {
        onChange(val);
        try {
            JSON.parse(val);
            setIsValid(true);
        } catch (e) {
            setIsValid(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</label>
                {!isValid && <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Invalid JSON</span>}
            </div>
            <textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                className={`
                    w-full bg-white/[0.02] border font-mono text-sm p-4 rounded-2xl focus:outline-none transition-all
                    ${isValid ? 'border-white/5 focus:border-primary/40' : 'border-red-500/40 focus:border-red-500'}
                    ${height}
                `}
            />
        </div>
    );
}

function SettingInput({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3.5 ${icon ? 'pl-12' : 'px-4'} pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all font-medium text-sm`}
        />
      </div>
    </div>
  );
}
