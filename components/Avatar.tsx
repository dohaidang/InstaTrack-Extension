import React from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FollowerStats from './pages/FollowerStats';
import ScanHistory from './pages/ScanHistory';
import Settings from './pages/Settings';
import DetailedSettings from './pages/DetailedSettings';

// Bottom Navigation Component
const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Don't show nav on detailed settings page to match flow
  if (location.pathname === '/settings/detailed') return null;

  return (
    <nav className="sticky bottom-0 bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-white/10 flex justify-around py-3 px-6 z-30 max-w-[480px] mx-auto w-full">
      <Link to="/" className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-primary' : 'text-gray-400'}`}>
        <span className={`material-symbols-outlined ${isActive('/') ? 'filled' : ''}`}>dashboard</span>
        <span className="text-[10px] font-bold">Dashboard</span>
      </Link>
      <Link to="/history" className={`flex flex-col items-center gap-1 ${isActive('/history') ? 'text-primary' : 'text-gray-400'}`}>
        <span className={`material-symbols-outlined ${isActive('/history') ? 'filled' : ''}`}>monitoring</span>
        <span className="text-[10px] font-medium">History</span>
      </Link>
      <Link to="/stats" className={`flex flex-col items-center gap-1 ${isActive('/stats') ? 'text-primary' : 'text-gray-400'}`}>
        <span className={`material-symbols-outlined ${isActive('/stats') ? 'filled' : ''}`}>group</span>
        <span className="text-[10px] font-medium">Accounts</span>
      </Link>
      <Link to="/settings" className={`flex flex-col items-center gap-1 ${isActive('/settings') ? 'text-primary' : 'text-gray-400'}`}>
        <span className={`material-symbols-outlined ${isActive('/settings') ? 'filled' : ''}`}>settings</span>
        <span className="text-[10px] font-medium">Settings</span>
      </Link>
    </nav>
  );
};

const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="bg-gray-100 min-h-screen flex justify-center">
      <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-background-light dark:bg-background-dark shadow-2xl overflow-x-hidden">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stats" element={<FollowerStats />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/detailed" element={<DetailedSettings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}