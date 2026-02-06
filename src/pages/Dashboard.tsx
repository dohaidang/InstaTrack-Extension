import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFollowerData } from '../hooks/useFollowerData';
import { getUsernameHistory, addUsernameToHistory, clearUsernameHistory } from '../utils/usernameHistory';
import { useLanguage } from '../hooks/useLanguage';

interface ScanProgress {
  phase: 'idle' | 'resolving' | 'followers' | 'following' | 'processing' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
  timestamp: number;
}

const StatCard = ({ icon, count, label, colorClass, iconBg }: { icon: string, count: string | number, label: string, colorClass: string, iconBg: string }) => (
  <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-col gap-3 h-full">
    <div className={`size-10 rounded-lg ${iconBg} flex items-center justify-center ${colorClass}`}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-[#181114] dark:text-white">{count}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 min-h-[40px] flex items-start">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
    const { stats, loading } = useFollowerData();
    const { t } = useLanguage();
    const [isScanning, setIsScanning] = useState(false);
    const [statusText, setStatusText] = useState("Ready to scan");
    const [targetUsername, setTargetUsername] = useState("");
    const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
    const [usernameHistory, setUsernameHistory] = useState<string[]>([]);
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Listen for scan progress updates
    useEffect(() => {
      const loadInitialProgress = async () => {
        const result = await chrome.storage.local.get(['scanProgress']);
        if (result.scanProgress) {
          const progress = result.scanProgress as ScanProgress;
          // Only show if recent (within last 5 minutes)
          if (Date.now() - progress.timestamp < 5 * 60 * 1000) {
            setScanProgress(progress);
            updateUIFromProgress(progress);
          }
        }
      };
      loadInitialProgress();

      const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
        if (areaName === 'local' && changes.scanProgress) {
          const progress = changes.scanProgress.newValue as ScanProgress;
          setScanProgress(progress);
          updateUIFromProgress(progress);
        }
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Load username history on mount
    useEffect(() => {
      getUsernameHistory().then(setUsernameHistory);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          setShowHistoryDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateUIFromProgress = (progress: ScanProgress) => {
      if (!progress) return;
      
      setStatusText(progress.message);
      
      if (progress.phase === 'done') {
        setIsScanning(false);
        setStatusText(`✅ ${progress.message}`);
      } else if (progress.phase === 'error') {
        setIsScanning(false);
        setStatusText(`❌ ${progress.message}`);
      } else if (progress.phase !== 'idle') {
        setIsScanning(true);
      }
    };

    const handleStartCrawl = async () => {
        if (!targetUsername) {
            setStatusText(t('enterUsername')); // Use generic message or keep specific logical one? 'Enter username first'
            return;
        }

        try {
            setStatusText(t('launching')); // Need to add 'launching' key or reuse scanningBtn
            setIsScanning(true);
            setScanProgress({ phase: 'idle', current: 0, total: 0, message: 'Starting...', timestamp: Date.now() });

            // Save username to history
            const updatedHistory = await addUsernameToHistory(targetUsername);
            setUsernameHistory(updatedHistory);

            // Set flags for content script to pick up
            await chrome.storage.local.set({ 
                targetUsername: targetUsername, 
                startOnLoad: true,
                scanProgress: { phase: 'idle', current: 0, total: 0, message: 'Launching...', timestamp: Date.now() }
            });

            const url = `https://www.instagram.com/${targetUsername}/`;

            // Check if we have an active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url && tab.url.includes("instagram.com")) {
                 // Navigate current tab
                 await chrome.tabs.update(tab.id!, { url: url });
            } else {
                 // Open new tab
                 await chrome.tabs.create({ url: url });
            }
            
            setStatusText(t('scanningBtn')); 
        } catch (error) {
            console.error("Launch Failed:", error);
            setStatusText("Error launching");
            setIsScanning(false);
        }
    };

    // Calculate progress percentage
    const getProgressPercent = (): number => {
      if (!scanProgress || scanProgress.total === 0) {
        return isScanning ? 10 : 100; // Show 10% when starting, 100% when idle
      }
      return Math.min(100, Math.round((scanProgress.current / scanProgress.total) * 100));
    };

    // Get progress display text
    const getProgressDisplay = (): string => {
      if (!scanProgress || !isScanning) return `${stats.totalFollowers}`;
      
      if (scanProgress.phase === 'followers') {
        return `${scanProgress.current}`;
      } else if (scanProgress.phase === 'following') {
        return `${scanProgress.current}`;
      }
      return `${scanProgress.current}`;
    };

    // Get phase label
    const getPhaseLabel = (): string => {
      if (!scanProgress || !isScanning) return t('followers').toLowerCase();
      
      switch (scanProgress.phase) {
        case 'resolving': return 'resolving...';
        case 'followers': return t('followers').toLowerCase();
        case 'following': return t('following').toLowerCase();
        case 'processing': return 'processing...';
        case 'done': return 'complete!';
        case 'error': return 'error';
        default: return t('followers').toLowerCase();
      }
    };

  return (
    <>
      {/* Header Section with Instagram Gradient */}
      <header className="bg-insta-gradient pb-8 pt-6 px-4 rounded-b-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        
        {/* Top App Bar Content */}
        <div className="flex items-center justify-between relative z-10 mb-6">
          <div className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-md cursor-pointer">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            @{stats.username || targetUsername || 'user'}
          </h2>
          <div className="flex w-10 items-center justify-end">
            <button className="flex items-center justify-center rounded-full size-10 bg-white/20 backdrop-blur-md text-white">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
        </div>

        {/* Profile Stats Layout */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex items-center justify-center gap-8 w-full">
            <div className="flex flex-col items-center text-white">
              <p className="text-xl font-bold">
                 {loading ? '...' : stats.totalFollowers}
              </p>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">{t('followers')}</p>
            </div>
            <Avatar 
              src={stats.avatarUrl || ''} 
              username={stats.username || 'user'}
              size="lg" 
              hasStory={true}
              className="border-4 border-white/30 backdrop-blur-sm"
            />
            <div className="flex flex-col items-center text-white">
              <p className="text-xl font-bold">
                {loading ? '...' : stats.totalFollowing}
              </p>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">{t('following')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-4 -mt-6 relative z-20 pb-24">
        {/* Fetching Card */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[#181114] dark:text-white text-base font-bold leading-tight">{statusText}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                 {stats.lastUpdated ? `${t('lastUpdated')}: ${stats.lastUpdated}` : t('noDataYet')}
              </p>
            </div>
            <div className="flex gap-2">
              <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border ${isScanning ? 'bg-insta-orange/10 border-insta-orange/30' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                <span className={`material-symbols-outlined text-[14px] ${isScanning ? 'text-insta-orange animate-spin' : 'text-gray-400'}`}>
                  {isScanning ? 'sync' : 'speed'}
                </span>
                <span className={`text-[12px] font-semibold ${isScanning ? 'text-insta-orange' : 'text-gray-600 dark:text-gray-300'}`}>
                  {isScanning ? t('scanningBtn') : t('ready')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-insta-orange text-sm font-bold">
                {getProgressDisplay()} <span className="text-gray-400 font-normal">{getPhaseLabel()}</span>
              </p>
              {isScanning && scanProgress && scanProgress.total > 0 && (
                <p className="text-xs text-gray-400">{getProgressPercent()}%</p>
              )}
            </div>
            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden">
              <div 
                className={`bg-gradient-to-r from-insta-yellow to-insta-orange h-full rounded-full transition-all duration-500 ${isScanning ? '' : ''}`} 
                style={{ width: `${getProgressPercent()}%` }}
              ></div>
            </div>
          </div>
          
           {/* Input Field with History Dropdown */}
           <div className="mb-4 relative">
             <input 
                ref={inputRef}
                type="text" 
                placeholder={t('enterUsername')}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-insta-orange"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                onFocus={() => usernameHistory.length > 0 && setShowHistoryDropdown(true)}
                disabled={isScanning}
             />
             
             {/* History Dropdown */}
             {showHistoryDropdown && usernameHistory.length > 0 && (
               <div 
                 ref={dropdownRef}
                 className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto"
               >
                 <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 dark:border-white/5">
                   <span className="text-xs text-gray-400 uppercase font-semibold">{t('recent')}</span>
                   <button 
                     onClick={async () => {
                       await clearUsernameHistory();
                       setUsernameHistory([]);
                       setShowHistoryDropdown(false);
                     }}
                     className="text-xs text-red-500 hover:text-red-600 font-medium"
                   >
                     {t('clear')}
                   </button>
                 </div>
                 {usernameHistory.map((username, index) => (
                   <button
                     key={index}
                     onClick={() => {
                       setTargetUsername(username);
                       setShowHistoryDropdown(false);
                     }}
                     className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2"
                   >
                     <span className="material-symbols-outlined text-gray-400 text-[16px]">history</span>
                     @{username}
                   </button>
                 ))}
               </div>
             )}
           </div>

          <button 
            onClick={handleStartCrawl}
            disabled={isScanning}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isScanning ? 'bg-insta-orange/10 text-insta-orange cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90'}`}
          >
            <span className={`material-symbols-outlined ${isScanning ? 'animate-spin' : ''}`}>{isScanning ? 'sync' : 'play_circle'}</span>
            {isScanning ? t('scanningBtn') : t('autoScan')}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/stats?tab=mutual" className="h-full">
            <StatCard 
                 icon="group" 
                 count={stats.mutualCount} 
                 label={t('mutualFriends')} 
                 colorClass="text-blue-500" 
                 iconBg="bg-blue-50 dark:bg-blue-900/20" 
            />
          </Link>
          <Link to="/stats?tab=lost" className="h-full">
            <StatCard 
                 icon="person_remove" 
                 count={stats.lostFollowersCount} 
                 label={t('lostFollowers')} 
                 colorClass="text-red-500" 
                 iconBg="bg-red-50 dark:bg-red-900/20" 
            />
          </Link>
          <Link to="/stats?tab=new" className="h-full">
            <StatCard 
                icon="person_add" 
                count={stats.newFollowersCount} 
                label={t('newFollowers')} 
                colorClass="text-green-500" 
                iconBg="bg-green-50 dark:bg-green-900/20" 
            />
          </Link>
          <Link to="/stats?tab=notfollowing" className="h-full">
            <StatCard 
                 icon="person_search" 
                 count={stats.notFollowingBackCount} 
                 label={t('notFollowingBack')} 
                 colorClass="text-orange-500" 
                 iconBg="bg-orange-50 dark:bg-orange-900/20" 
            />
          </Link>
        </div>

        {/* Detailed Analysis Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#181114] dark:text-white text-lg font-bold leading-tight">{t('quickActions')}</h3>
            <button className="text-primary text-sm font-bold">{t('seeAll')}</button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#181114] dark:text-white">{t('profileEngagement')}</p>
                  <p className="text-xs text-gray-500">{t('analyzeReach')}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                  <span className="material-symbols-outlined">person_off</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#181114] dark:text-white">{t('ghostFollowers')}</p>
                  <p className="text-xs text-gray-500">{t('findInactive')}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;