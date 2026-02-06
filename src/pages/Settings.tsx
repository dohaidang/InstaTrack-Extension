import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFollowerData } from '../hooks/useFollowerData';

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
    <div className="pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 pb-2 justify-between border-b border-[#e6dbe0] dark:border-white/10">
        <div onClick={() => navigate(-1)} className="text-[#181114] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </div>
        <h2 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Settings</h2>
        <div className="size-12 flex items-center justify-end">
          <span className="material-symbols-outlined cursor-pointer text-[#181114] dark:text-white">more_horiz</span>
        </div>
      </div>

      <div className="flex p-6">
        <div className="flex w-full flex-col gap-4 items-center">
          <div className="flex gap-4 flex-col items-center text-center">
            <Avatar 
              src={stats.avatarUrl || ''} 
              username={stats.username || 'user'}
              size="xl" 
              hasStory={true}
              className="border-4 border-white dark:border-background-dark"
            />
            <div>
              <p className="text-[#181114] dark:text-white text-2xl font-bold leading-tight tracking-tight">
                @{stats.username || 'Not Connected'}
              </p>
              <div className={`mt-2 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                loading 
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  : stats.username 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-500'
              }`}>
                {loading ? 'Loading...' : stats.username ? 'Logged in' : 'Not Logged in'}
              </div>
              <p className={`text-sm font-normal mt-2 ${
                stats.username 
                  ? 'text-[#896175] dark:text-gray-400' 
                  : 'text-red-400 dark:text-red-500'
              }`}>
                {stats.username ? 'Connected via Extension' : 'Open Instagram to connect'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <h3 className="text-[#896175] dark:text-gray-400 text-[13px] font-semibold uppercase tracking-wider px-1 pb-2">App Settings</h3>
        <div className="bg-white dark:bg-white/5 border border-[#e6dbe0] dark:border-white/10 rounded-lg overflow-hidden shadow-sm">
          <SettingsItem 
            icon="language" 
            color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
            label="Language" 
            value="English"
            hasChevron
            to="/settings/detailed"
          />
          <SettingsItem 
            icon="qr_code_scanner" 
            color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
            label="Scanning"
            hasChevron
            to="/settings/detailed"
          />
          <SettingsItem 
            icon="notifications" 
            color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" 
            label="Notifications"
            hasToggle
            toggleChecked={notifications}
            onToggleChange={handleNotificationsToggle}
          />
          <SettingsItem 
            icon="dark_mode" 
            color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
            label="Dark Mode"
            hasToggle
            toggleChecked={isDarkMode}
            onToggleChange={handleDarkModeToggle}
            isLast
          />
        </div>
      </div>

      <div className="px-4 mt-8 flex flex-col items-center gap-4">
        <button className="w-full bg-red-50 dark:bg-red-500/10 text-red-500 font-bold py-4 rounded-lg flex items-center justify-center gap-2 active:bg-red-100 dark:active:bg-red-500/20 transition-colors">
          <span className="material-symbols-outlined text-xl">logout</span>
          Log Out
        </button>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[#896175] dark:text-gray-500 text-xs font-medium">Version 1.0.0</p>
          <p className="text-[#896175]/60 dark:text-gray-600 text-[10px] uppercase tracking-tighter">Powered by DoHaiDang</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;