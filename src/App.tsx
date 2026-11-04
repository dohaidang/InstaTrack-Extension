import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FollowerStats from './pages/FollowerStats';
import ScanHistory from './pages/ScanHistory';
import Settings from './pages/Settings';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';
import { Icon, type IconName } from './components/Icon';

// ── Bottom Navigation ─────────────────────────────────────────────────────────
const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const isActive = (path: string) => location.pathname === path;

  if (location.pathname === '/settings/detailed') return null;

  const navItems: { to: string; icon: IconName; label: string }[] = [
    { to: '/',         icon: 'dashboard',  label: t('dashboard') },
    { to: '/stats',    icon: 'accounts',   label: t('accounts') },
    { to: '/history',  icon: 'history',    label: t('history') },
    { to: '/settings', icon: 'settings',   label: t('settings') },
  ];

  return (
    <div className="bottom-nav-wrap">
      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map(({ to, icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`bottom-nav__item ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
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
    <div className="extension-shell">
      <main className="extension-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stats" element={<FollowerStats />} />
            <Route path="/history" element={<ScanHistory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/detailed" element={<Settings />} />
          </Routes>
        </Layout>
      </HashRouter>
    </LanguageProvider>
  );
}
