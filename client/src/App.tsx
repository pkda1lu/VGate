import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InboundList from './pages/InboundList';
import ClientList from './pages/ClientList';
import NodeList from './pages/NodeList';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Login from './pages/Login';
import Setup from './pages/Setup';
import SSLWarning from './components/SSLWarning';
import { useEffect, useState } from 'react';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('vgate_token');
    setIsAuthenticated(!!token);
  }, [location]);

  if (isAuthenticated === null) return null;

  const isAuthPage = location.pathname === '/login' || location.pathname === '/setup';

  return (
    <div className={`flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 ${!isAuthenticated && !isAuthPage ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'}`}>
      {!isAuthPage && <Sidebar />}
      
      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${isAuthPage ? 'px-0 py-0' : 'px-12 py-12'} relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background`}>
        {/* Background Decoration */}
        {!isAuthPage && (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />
          </>
        )}

        {/* Page Transitions Container */}
        <div className={`${isAuthPage ? 'w-full h-full' : 'max-w-7xl mx-auto relative z-10 space-y-12'}`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            
            {/* Protected Routes */}
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/nodes" element={isAuthenticated ? <NodeList /> : <Navigate to="/login" />} />
            <Route path="/inbounds" element={isAuthenticated ? <InboundList /> : <Navigate to="/login" />} />
            <Route path="/clients" element={isAuthenticated ? <ClientList /> : <Navigate to="/login" />} />
            <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
            <Route path="/logs" element={isAuthenticated ? <Logs /> : <Navigate to="/login" />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {!isAuthPage && <SSLWarning />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
