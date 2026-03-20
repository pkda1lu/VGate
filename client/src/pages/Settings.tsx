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
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings, restartXray } from '../lib/api';
import useSWR from 'swr';

export default function Settings() {
  const { data: settings, mutate, isLoading } = useSWR('/settings', () => getSettings().then(res => res.data));
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

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500 max-w-4xl mx-auto">
      <header className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary glow shadow-primary/5">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2">Configure your VGate panel and Xray core parameters</p>
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Xray Configuration Section */}
          <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold">Xray Core</h2>
            </div>
            
            <SettingInput
              label="Binary Path"
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
              placeholder="/etc/xray/config.json"
            />
          </section>

          {/* Panel Configuration Section */}
          <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold">Panel Interface</h2>
            </div>
            
            <SettingInput
              label="Panel Port"
              type="number"
              icon={<Shield className="w-4 h-4" />}
              value={formData.panel_port || '4000'}
              onChange={(v) => setFormData({ ...formData, panel_port: v })}
              placeholder="4000"
            />

            <div className="pt-4">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">System Actions</label>
              <button
                type="button"
                onClick={handleRestart}
                disabled={isRestarting}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 px-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isRestarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Restart Xray Core
              </button>
            </div>
          </section>
        </div>

        {/* Telegram Integration (Premium feel) */}
        <section className="glass p-8 rounded-[32px] border border-white/5 space-y-6 glow">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold">Telegram Integration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingInput
              label="Bot Token"
              value={formData.telegram_token || ''}
              onChange={(v) => setFormData({ ...formData, telegram_token: v })}
              placeholder="123456789:ABCDE..."
            />
            <SettingInput
              label="Chat ID"
              value={formData.telegram_chat_id || ''}
              onChange={(v) => setFormData({ ...formData, telegram_chat_id: v })}
              placeholder="123456789"
            />
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-3xl font-bold flex items-center gap-3 transition-all glow shadow-primary/20 active:scale-[0.98] disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Configuration
          </button>
        </div>
      </form>
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
