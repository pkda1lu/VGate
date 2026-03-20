import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InboundList from './pages/InboundList';
import ClientList from './pages/ClientList';
import Settings from './pages/Settings';
import Logs from './pages/Logs';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
        <Sidebar />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-12 py-12 relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
          {/* Background Decoration */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Page Transitions Container */}
          <div className="max-w-7xl mx-auto relative z-10 space-y-12">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inbounds" element={<InboundList />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/logs" element={<Logs />} />
              {/* Fallback */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
