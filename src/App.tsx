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
    { to: '/',         icon: 'dashboard',  label: t('dashboard') },
    { to: '/stats',    icon: 'monitoring', label: t('accounts') },
    { to: '/history',  icon: 'history',    label: t('history') },
    { to: '/settings', icon: 'settings',   label: t('settings') },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] z-50">
      <nav className="flex justify-around items-center px-1 py-1.5 glass-dock rounded-full">
        {navItems.map(({ to, icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer flex-1
                ${active
                  ? 'text-white'
                  : 'text-[#94A3B8] hover:text-white'
                }`}
            >
              {active && (
                <span className="absolute inset-0 bg-white/[0.08] rounded-full border border-white/[0.05] z-0" />
              )}
              <span
                className="material-symbols-outlined text-[20px] relative z-10"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider relative z-10">{label}</span>
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 bg-[#E1306C] rounded-full shadow-[0_0_8px_#E1306C] z-10" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

// ── Layout ────────────────────────────────────────────────────────────────────
const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="w-[360px] h-[600px] bg-[#0B1020] text-[#F8FAFC] flex flex-col overflow-hidden relative">
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 no-scrollbar">
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