import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFollowerData } from '../hooks/useFollowerData';
import { useLanguage } from '../hooks/useLanguage';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only peer" 
      type="checkbox" 
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
  </label>
);

interface SettingsItemProps {
  icon: string;
  color: string;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleChecked?: boolean;
  onToggleChange?: (checked: boolean) => void;
  hasChevron?: boolean;
  isLast?: boolean;
  to?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, color, label, value, 
  hasToggle = false, toggleChecked = false, onToggleChange,
  hasChevron = false, isLast = false, to 
}) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => to && navigate(to)}
      className={`flex items-center justify-between p-4 ${!isLast ? 'border-b border-[#e6dbe0] dark:border-white/10' : ''} ${to ? 'active:bg-gray-50 dark:active:bg-white/5 cursor-pointer transition-colors' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <p className="text-[#181114] dark:text-white font-medium">{label}</p>
      </div>
      
      {(value || hasChevron) && (
        <div className="flex items-center gap-1 text-[#896175] dark:text-gray-400">
          {value && <p className="text-sm">{value}</p>}
          {hasChevron && <span className="material-symbols-outlined text-lg">chevron_right</span>}
        </div>
      )}

      {hasToggle && <Toggle checked={toggleChecked} onChange={onToggleChange || (() => {})} />}
    </div>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { stats, loading } = useFollowerData();
  const { t, language } = useLanguage();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Load settings on mount
  useEffect(() => {
    chrome.storage.local.get(['darkMode', 'notifications'], (result) => {
      const darkMode = (result.darkMode as boolean) ?? false;
      const notif = (result.notifications as boolean) ?? true;
      setIsDarkMode(darkMode);
      setNotifications(notif);
      
      // Apply dark mode class
      document.documentElement.classList.toggle('dark', darkMode);
    });
  }, []);

  // Handle dark mode toggle
  const handleDarkModeToggle = (enabled: boolean) => {
    setIsDarkMode(enabled);
    document.documentElement.classList.toggle('dark', enabled);
    chrome.storage.local.set({ darkMode: enabled });
  };

  // Handle notifications toggle
  const handleNotificationsToggle = (enabled: boolean) => {
    setNotifications(enabled);
    chrome.storage.local.set({ notifications: enabled });
  };

  return (
    <div className="pb-24 bg-[#0B1020] text-[#F8FAFC] min-h-screen">
      {/* Top Header */}
      <div className="sticky top-0 z-50 flex items-center bg-[#0B1020]/80 backdrop-blur-md p-4 justify-between border-b border-white/[0.06]">
        <button 
          onClick={() => navigate(-1)} 
          className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full transition-colors text-[#F8FAFC]"
        >
          <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#F8FAFC] text-base font-extrabold leading-tight tracking-tight flex-1 text-center">{t('settings')}</h2>
        <div className="size-10 flex items-center justify-end text-[#F8FAFC]">
          <span className="material-symbols-outlined text-xl cursor-pointer">more_horiz</span>
        </div>
      </div>

      {/* User Connection Card */}
      <div className="flex p-6">
        <div className="flex w-full flex-col items-center">
          <div className="flex flex-col items-center text-center">
            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#E1306C] via-[#833AB4] to-[#6366F1] shadow-[0_0_15px_rgba(225,48,108,0.2)]">
              <div className="rounded-full bg-[#0B1020] p-1">
                <Avatar 
                  src={stats.avatarUrl || ''} 
                  username={stats.username || 'user'}
                  size="xl" 
                />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[#F8FAFC] text-xl font-black tracking-tight">
                @{stats.username || 'Not Connected'}
              </p>
              <div className={`mt-2.5 inline-flex items-center px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                loading 
                  ? 'bg-white/5 text-[#94A3B8]/60'
                  : stats.username 
                    ? 'bg-[#E1306C]/10 border border-[#E1306C]/20 text-[#E1306C]' 
                    : 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]'
              }`}>
                {loading ? 'Loading...' : stats.username ? 'Logged in' : 'Not Logged in'}
              </div>
              <p className={`text-xs font-semibold mt-2.5 ${
                stats.username 
                  ? 'text-[#94A3B8]/60' 
                  : 'text-[#EF4444]/70'
              }`}>
                {stats.username ? 'Connected via Extension' : 'Open Instagram to connect'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Options List */}
      <div className="px-4">
        <h3 className="text-[#94A3B8]/50 text-[10px] font-black uppercase tracking-widest px-1 pb-2">{t('appSettings')}</h3>
        <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.04]">
          <SettingsItem 
            icon="language" 
            color="bg-blue-500/10 border border-blue-500/20 text-blue-400" 
            label={t('language')}
            value={language === 'en' ? 'English' : 'Tiếng Việt'}
            hasChevron
            to="/settings/detailed"
          />
          <SettingsItem 
            icon="qr_code_scanner" 
            color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
            label={t('scanning')}
            hasChevron
            to="/settings/detailed"
          />
          <SettingsItem 
            icon="notifications" 
            color="bg-amber-500/10 border border-amber-500/20 text-amber-400" 
            label={t('notifications')}
            hasToggle
            toggleChecked={notifications}
            onToggleChange={handleNotificationsToggle}
          />
          <SettingsItem 
            icon="dark_mode" 
            color="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" 
            label={t('darkMode')}
            hasToggle
            toggleChecked={isDarkMode}
            onToggleChange={handleDarkModeToggle}
            isLast
          />
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-4 mt-8 flex flex-col items-center gap-4">
        <button className="w-full bg-[#EF4444]/10 hover:bg-[#EF4444]/15 border border-[#EF4444]/20 text-[#EF4444] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs">
          <span className="material-symbols-outlined text-lg">logout</span>
          {t('logOut')}
        </button>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[#94A3B8]/40 text-[10px] font-bold">{t('version')} 2.4.1</p>
          <p className="text-[#94A3B8]/20 text-[8px] uppercase font-black tracking-widest">{t('poweredBy')}</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;