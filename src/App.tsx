import React from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FollowerStats from './pages/FollowerStats';
import ScanHistory from './pages/ScanHistory';
import Settings from './pages/Settings';
import DetailedSettings from './pages/DetailedSettings';
import { useLanguage } from './hooks/useLanguage';

// ── Bottom Navigation ─────────────────────────────────────────────────────────
const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const isActive = (path: string) => location.pathname === path;

  if (location.pathname === '/settings/detailed') return null;

  const navItems = [
    { to: '/',         icon: 'search',    label: t('dashboard') },
    { to: '/stats',    icon: 'analytics', label: t('accounts') },
    { to: '/history',  icon: 'history',   label: t('history') },
    { to: '/settings', icon: 'settings',  label: t('settings') },
  ];

  return (
    <nav className="sticky bottom-0 flex justify-around items-center px-3 pb-3 pt-2 bg-white/80 dark:bg-[#1a0a12]/80 backdrop-blur-xl border-t border-outline-variant/20 rounded-t-[1.5rem] z-30 max-w-[480px] mx-auto w-full">
      {navItems.map(({ to, icon, label }) => {
        const active = isActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer
              ${active
                ? 'bg-brand-gradient text-on-primary shadow-md shadow-primary/20 scale-105'
                : 'text-on-surface-variant hover:text-primary'
              }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="w-[360px] h-[600px] bg-surface dark:bg-background-dark flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/"                element={<Dashboard />} />
          <Route path="/stats"           element={<FollowerStats />} />
          <Route path="/history"         element={<ScanHistory />} />
          <Route path="/settings"        element={<Settings />} />
          <Route path="/settings/detailed" element={<DetailedSettings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}