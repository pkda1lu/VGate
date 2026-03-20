import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  Zap, 
  Activity, 
  Globe, 
  Shield 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/inbounds', label: 'Inbounds', icon: <Shield className="w-5 h-5" /> },
  { path: '/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
  { path: '/logs', label: 'Panel Logs', icon: <Activity className="w-5 h-5" /> },
  { path: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export default function Sidebar() {
  return (
    <aside className="w-72 bg-background border-r border-white/5 flex flex-col h-full sticky left-0 top-0 overflow-y-auto">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center glow shadow-primary/40 rotate-12 group hover:rotate-0 transition-transform duration-500">
           <Zap className="text-white w-6 h-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight leading-none">VGATE</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">v1.0.0-PRO</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all group
              ${isActive 
                ? 'bg-primary/10 text-primary border border-primary/20 glow shadow-primary/5' 
                : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground border border-transparent'
              }
            `}
          >
            <span className="group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5 bg-white/[0.01]">
         <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 group hover:border-primary/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                 <Globe className="w-4 h-4" />
               </div>
               <div className="flex flex-col flex-1 truncate">
                  <span className="text-xs font-bold truncate">Server Node #1</span>
                  <span className="text-[10px] text-muted-foreground">DE-FRA-01 (Online)</span>
               </div>
            </div>
         </div>
      </div>
    </aside>
  );
}
