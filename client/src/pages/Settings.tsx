import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw,
  Shield, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  User,
  MessageSquare,
  Rss,
  Key,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../lib/api';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'panel' | 'account' | 'telegram' | 'sub';

export default function Settings() {
  const { data: settings, mutate, isLoading } = useSWR('/settings', () => getSettings().then(res => res.data));
  const [activeTab, setActiveTab] = useState<TabType>('panel');
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
      setMessage({ type: 'success', text: 'Конфигурация успешно обновлена' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при сохранении настроек' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    const { restartXray } = await import('../lib/api');
    setIsRestarting(true);
    setMessage(null);
    try {
      await restartXray();
      setMessage({ type: 'success', text: 'Ядро Xray успешно перезапущено' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при перезапуске Xray' });
    } finally {
      setIsRestarting(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-muted-foreground font-medium animate-pulse">Инициализация системы...</p>
    </div>
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'panel', label: 'Панель', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'account', label: 'Учетная запись', icon: <User className="w-4 h-4" /> },
    { id: 'telegram', label: 'Telegram-Бот', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'sub', label: 'Подписка', icon: <Rss className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in duration-500 max-w-7xl mx-auto pb-24 px-4">
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all relative
              ${activeTab === tab.id 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-white'
              }
            `}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="setting-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            )}
          </button>
        ))}
      </div>

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

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
        >
          <form onSubmit={handleSave} className="space-y-6">
            
            {activeTab === 'panel' && (
              <div className="space-y-4">
                <AccordionSection title="Основные настройки" defaultOpen icon={<SettingsIcon />}>
                   <div className="grid grid-cols-1 gap-y-10 py-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                         <div className="space-y-1">
                            <h4 className="font-bold text-sm text-white/90 group-hover:text-primary transition-colors">Модель примечания и символ разделения</h4>
                            <p className="text-[11px] text-muted-foreground">Пример примечания: #Inbound-Email-Other</p>
                         </div>
                         <div className="flex gap-2 w-full md:w-[400px]">
                            <select className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl h-10 px-4 text-xs font-bold focus:outline-none focus:border-primary/50 appearance-none cursor-pointer text-white">
                               <option className="bg-[#121214]">Inbound, Email, Other</option>
                            </select>
                            <input className="w-20 bg-white/[0.03] border border-white/5 rounded-xl h-10 px-4 text-xs font-bold focus:outline-none focus:border-primary/50 text-center" value="-" readOnly />
                         </div>
                      </div>

                      <SettingsRow 
                        label="IP-адрес для управления панелью" 
                        description="Оставьте пустым для подключения с любого IP"
                        value={formData.panel_ip || ''}
                        onChange={(v: string) => setFormData({...formData, panel_ip: v})}
                        placeholder="8.8.8.8"
                      />

                      <SettingsRow 
                        label="Домен панели" 
                        description="Оставьте пустым для подключения с любых доменов и IP"
                        value={formData.panel_domain || ''}
                        onChange={(v: string) => setFormData({...formData, panel_domain: v})}
                        placeholder="vgate.example.com"
                      />

                      <SettingsRow 
                        label="Порт панели" 
                        description="Порт, на котором работает панель"
                        value={formData.panel_port || '4000'}
                        onChange={(v: string) => setFormData({...formData, panel_port: v})}
                        type="number"
                      />

                      <SettingsRow 
                        label="Корневой путь URL адреса панели" 
                        description="Должен начинаться с '/' и заканчиваться '/'"
                        value={formData.panel_root_path || '/'}
                        onChange={(v: string) => setFormData({...formData, panel_root_path: v})}
                        placeholder="/secret/"
                      />

                      <SettingsRow 
                        label="Продолжительность сессии" 
                        description="Продолжительность сессии в системе (значение: минута)"
                        value={formData.session_duration || '360'}
                        onChange={(v: string) => setFormData({...formData, session_duration: v})}
                        type="number"
                      />

                      <SettingsRow 
                        label="Размер нумерации страниц" 
                        description="Определить размер страницы для таблицы подключений. Установите 0, чтобы отключить"
                        value={formData.page_size || '25'}
                        onChange={(v: string) => setFormData({...formData, page_size: v})}
                        type="number"
                      />

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                         <div className="space-y-1">
                            <h4 className="font-bold text-sm text-white/90 group-hover:text-primary transition-colors">Язык интерфейса</h4>
                         </div>
                         <div className="w-full md:w-[400px]">
                            <select className="w-full bg-white/[0.03] border border-white/5 rounded-xl h-10 px-4 text-xs font-bold focus:outline-none focus:border-primary/50 appearance-none cursor-pointer text-white">
                               <option className="bg-[#121214]">ru-RU - Русский</option>
                               <option className="bg-[#121214]">en-US - English</option>
                            </select>
                         </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h4 className="font-bold text-sm text-white/90">Перезагрузка службы</h4>
                                <p className="text-[11px] text-muted-foreground">Примените изменения ядра Xray немедленно</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleRestart}
                                disabled={isRestarting}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 px-6 font-bold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-xs text-white"
                            >
                                {isRestarting ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <RefreshCw className="w-4 h-4" />}
                                Перезапустить Xray
                            </button>
                        </div>
                      </div>
                   </div>
                </AccordionSection>

                <AccordionSection title="Уведомления" icon={<MessageSquare />}>
                   <p className="text-xs text-muted-foreground p-4">Настройки уведомлений будут доступны в следующем обновлении.</p>
                </AccordionSection>

                <AccordionSection title="Сертификаты" icon={<Shield />}>
                  <div className="grid grid-cols-1 gap-y-10 py-4">
                    <SettingsRow 
                      label="Путь к SSL сертификату (Fullchain)" 
                      value={formData.ssl_cert || ''}
                      onChange={(v: string) => setFormData({...formData, ssl_cert: v})}
                      placeholder="/etc/vgate/server/fullchain.pem"
                    />
                    <SettingsRow 
                      label="Путь к SSL ключу (Privkey)" 
                      value={formData.ssl_key || ''}
                      onChange={(v: string) => setFormData({...formData, ssl_key: v})}
                      placeholder="/etc/vgate/server/privkey.pem"
                    />
                  </div>
                </AccordionSection>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-4">
                <AccordionSection title="Учетные данные администратора" defaultOpen icon={<User />}>
                  <div className="grid grid-cols-1 gap-y-10 py-4">
                     <SettingsRow label="Текущий логин" value="admin" disabled />
                     <SettingsRow label="Текущий пароль" value="********" type="password" disabled />
                     <SettingsRow 
                       label="Новый логин" 
                       value={formData.new_username || ''} 
                       onChange={(v: string) => setFormData({...formData, new_username: v})}
                     />
                     <SettingsRow 
                       label="Новый пароль" 
                       value={formData.new_password || ''} 
                       type="password"
                       onChange={(v: string) => setFormData({...formData, new_password: v})}
                     />
                     
                     <div className="pt-4">
                        <button type="submit" className="bg-emerald-500 py-3 px-10 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                          Подтвердить
                        </button>
                     </div>
                  </div>
                </AccordionSection>

                <AccordionSection title="Двухфакторная аутентификация" icon={<Key />}>
                  <p className="text-xs text-muted-foreground p-4">Настройки 2FA будут доступны в следующем обновлении.</p>
                </AccordionSection>
              </div>
            )}

            {activeTab === 'telegram' && (
               <AccordionSection title="Настройки Telegram Бота" defaultOpen icon={<MessageSquare />}>
                  <div className="grid grid-cols-1 gap-y-10 py-4">
                      <SettingsRow 
                        label="Токен Telegram-бота" 
                        description="Получите его у @BotFather"
                        value={formData.telegram_token || ''}
                        onChange={(v: string) => setFormData({...formData, telegram_token: v})}
                        placeholder="0000000000:AA..."
                      />
                      <SettingsRow 
                        label="Ваш Chat ID" 
                        description="ID администратора для управления"
                        value={formData.telegram_chat_id || ''}
                        onChange={(v: string) => setFormData({...formData, telegram_chat_id: v})}
                        placeholder="123456789"
                      />
                  </div>
               </AccordionSection>
            )}

            {activeTab === 'sub' && (
              <div className="space-y-4">
                <AccordionSection title="Основные настройки подписки" defaultOpen icon={<Rss />}>
                   <div className="grid grid-cols-1 gap-y-10 py-4">
                      <SettingsToggle 
                        label="Включить подписку" 
                        description="Функция подписки с отдельной конфигурацией"
                        value={formData.sub_enabled === 'true'}
                        onChange={(v) => setFormData({...formData, sub_enabled: v ? 'true' : 'false'})}
                      />
                      <SettingsToggle 
                        label="JSON Subscription" 
                        description="Включить/отключить JSON-эндпоинт подписки"
                        value={formData.sub_json === 'true'}
                        onChange={(v) => setFormData({...formData, sub_json: v ? 'true' : 'false'})}
                      />
                      <SettingsRow 
                        label="Заголовок подписки" 
                        description="Название подписки, которое видит клиент в VPN"
                        value={formData.sub_title || 'VGate-VPN'}
                        onChange={(v: string) => setFormData({...formData, sub_title: v})}
                      />
                      <SettingsRow 
                        label="Порт подписки" 
                        description="Номер порта для обслуживания службы подписки"
                        value={formData.sub_port || '2055'}
                        onChange={(v: string) => setFormData({...formData, sub_port: v})}
                        type="number"
                      />
                      <SettingsRow 
                        label="Корневой путь URL-адреса подписки" 
                        description="Должен начинаться с '/' и заканчиваться '/'"
                        value={formData.sub_path || '/sub/'}
                        onChange={(v: string) => setFormData({...formData, sub_path: v})}
                        placeholder="/sub/"
                      />
                   </div>
                </AccordionSection>

                <AccordionSection title="Информация" icon={<Info />}>
                   <div className="grid grid-cols-1 gap-y-10 py-4">
                      <SettingsToggle label="Шифровать конфиги" description="Шифровать возвращаемые конфиги в подписке" value={true} />
                      <SettingsToggle label="Показать информацию об использовании" description="Остаток трафика и дата окончания" value={true} />
                   </div>
                </AccordionSection>

                 <AccordionSection title="Интервалы" icon={<Clock />}>
                    <SettingsRow label="Интервал обновления подписки" description="Интервал между обновлениями (в часах)" value="24" onChange={() => {}} />
                 </AccordionSection>
              </div>
            )}

            <div className="pt-8 flex justify-end sticky bottom-8 pointer-events-none">
               <button
                  type="submit"
                  disabled={isSaving}
                  className="pointer-events-auto bg-primary hover:bg-primary/90 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all glow shadow-primary/40 active:scale-95 disabled:opacity-70 flex items-center gap-3"
               >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить настройки
               </button>
            </div>

          </form>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}

// --- Internal Components ---

function AccordionSection({ title, icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground group-hover:text-primary transition-colors">
            {icon}
          </div>
          <span className="font-bold text-sm tracking-tight">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-8 pt-0 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsRow({ label, description, value, onChange, placeholder, type = "text", disabled = false }: any) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
      <div className="space-y-1 flex-1">
        <h4 className="font-bold text-sm text-white/90 group-hover:text-primary transition-colors">{label}</h4>
        {description && <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      <div className="w-full md:w-[600px] relative">
        <input
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white/[0.03] border border-white/5 rounded-xl h-12 px-5 text-sm font-semibold focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all placeholder:opacity-30 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isPassword && (
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsToggle({ label, description, value, onChange }: { label: string, description?: string, value: boolean, onChange?: (v: boolean) => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
      <div className="space-y-1 flex-1">
        <h4 className="font-bold text-sm text-white/90 group-hover:text-primary transition-colors">{label}</h4>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange?.(!value)}
        className={`
          w-14 h-7 rounded-full transition-all relative
          ${value ? 'bg-[#00a382]' : 'bg-[#27272a]'}
        `}
      >
        <div className={`
          absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all duration-300
          ${value ? 'translate-x-7' : 'translate-x-0'}
        `} />
      </button>
    </div>
  );
}
