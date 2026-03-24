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

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  icon, count, label, colorClass, iconBg, to,
}: {
  icon: string; count: string | number; label: string;
  colorClass: string; iconBg: string; to: string;
}) => (
  <Link to={to} className="block cursor-pointer">
    <div className="bg-surface-container-lowest p-4 rounded-[1rem] shadow-sm border border-outline-variant/20 flex flex-col gap-3 h-full hover:shadow-md transition-shadow duration-200">
      <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center ${colorClass}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-on-surface">{count}</p>
        <p className="text-xs text-on-surface-variant min-h-[32px] flex items-start pt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  </Link>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { stats, loading } = useFollowerData();
  const { t } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Ready to scan');
  const [targetUsername, setTargetUsername] = useState('');
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [usernameHistory, setUsernameHistory] = useState<string[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── listen for scan progress ───────────────────────────────────────────────
  useEffect(() => {
    const loadInitialProgress = async () => {
      const result = await chrome.storage.local.get(['scanProgress']);
      if (result.scanProgress) {
        const progress = result.scanProgress as ScanProgress;
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

  useEffect(() => { getUsernameHistory().then(setUsernameHistory); }, []);

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowHistoryDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateUIFromProgress = (progress: ScanProgress) => {
    if (!progress) return;
    setStatusText(progress.message);
    if (progress.phase === 'done') {
      setIsScanning(false);
      setStatusText(progress.message);
    } else if (progress.phase === 'error') {
      setIsScanning(false);
      setStatusText(`❌ ${progress.message}`);
    } else if (progress.phase !== 'idle') {
      setIsScanning(true);
    }
  };

  const handleStartCrawl = async () => {
    if (!targetUsername) { setStatusText(t('enterUsername')); return; }
    try {
      setStatusText(t('launching'));
      setIsScanning(true);
      setScanProgress({ phase: 'idle', current: 0, total: 0, message: 'Starting...', timestamp: Date.now() });
      const updatedHistory = await addUsernameToHistory(targetUsername);
      setUsernameHistory(updatedHistory);
      await chrome.storage.local.set({
        targetUsername,
        startOnLoad: true,
        scanProgress: { phase: 'idle', current: 0, total: 0, message: 'Launching...', timestamp: Date.now() },
      });
      const url = `https://www.instagram.com/${targetUsername}/`;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('instagram.com')) {
        await chrome.tabs.update(tab.id!, { url });
      } else {
        await chrome.tabs.create({ url });
      }
      setStatusText(t('scanningBtn'));
    } catch (error) {
      console.error('Launch Failed:', error);
      setStatusText('Error launching');
      setIsScanning(false);
    }
  };

  const getProgressPercent = (): number => {
    if (!scanProgress || scanProgress.total === 0) return isScanning ? 10 : 100;
    return Math.min(100, Math.round((scanProgress.current / scanProgress.total) * 100));
  };

  const getProgressDisplay = (): string => {
    if (!scanProgress || !isScanning) return `${stats.totalFollowers}`;
    return `${scanProgress.current}`;
  };

  const getPhaseLabel = (): string => {
    if (!scanProgress || !isScanning) return t('followers').toLowerCase();
    switch (scanProgress.phase) {
      case 'resolving':   return 'resolving...';
      case 'followers':   return t('followers').toLowerCase();
      case 'following':   return t('following').toLowerCase();
      case 'processing':  return 'processing...';
      case 'done':        return 'complete!';
      case 'error':       return 'error';
      default:            return t('followers').toLowerCase();
    }
  };

  return (
    <>
      {/* ── Profile Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-gradient p-7 text-on-primary">
        {/* decorative blobs */}
        <div className="absolute -top-14 -right-14 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* top bar */}
        <div className="relative flex items-center justify-between mb-6">
          <h1 className="text-base font-extrabold tracking-tight opacity-90">Digital Curator</h1>
          <Link to="/settings">
            <button className="size-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
          </Link>
        </div>

        {/* profile */}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-3 inline-block">
            {/* ring auto-sizes around Avatar — no fixed px to prevent overflow */}
            <div className="p-[3px] rounded-full bg-white/30 backdrop-blur-md">
              <Avatar
                src={stats.avatarBase64 || stats.avatarUrl || ''}
                username={stats.username || 'user'}
                size="lg"
                hasStory={false}
              />
            </div>
            {/* online dot */}
            <div className="absolute bottom-1 right-1 bg-green-400 w-4 h-4 rounded-full border-2 border-[#b6004f]" />
          </div>

          <h2 className="text-lg font-extrabold tracking-tight mb-0.5">
            @{stats.username || targetUsername || 'user'}
          </h2>
          <p className="text-[11px] text-white/70 font-medium mb-5">Instagram Tracker</p>

          <div className="grid grid-cols-2 gap-10 w-full">
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold tracking-tighter">
                {loading ? '...' : stats.totalFollowers.toLocaleString()}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 mt-0.5">
                {t('followers')}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold tracking-tighter">
                {loading ? '...' : stats.totalFollowing.toLocaleString()}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/60 mt-0.5">
                {t('following')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Scan Control Card ─────────────────────────────────────────────── */}
      <div className="px-4 -mt-3 relative z-10 space-y-4 pb-4">
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 shadow-[0_10px_40px_rgba(74,33,53,0.08)] space-y-4">

          {/* status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isScanning ? (
                <span className="material-symbols-outlined text-[16px] text-primary animate-spin">sync</span>
              ) : (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
              )}
              <span className="text-sm font-bold text-on-surface truncate max-w-[160px]">{statusText}</span>
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              isScanning
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}>
              {isScanning ? t('scanningBtn') : t('ready')}
            </span>
          </div>

          {/* progress bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-primary text-sm font-extrabold">
                {getProgressDisplay()}{' '}
                <span className="text-on-surface-variant font-normal">{getPhaseLabel()}</span>
              </p>
              {isScanning && scanProgress && scanProgress.total > 0 && (
                <p className="text-[11px] text-on-surface-variant">{getProgressPercent()}%</p>
              )}
            </div>
            <div className="w-full bg-surface-container-low rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-brand-gradient h-full rounded-full transition-all duration-500"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>
          </div>

          {/* input + dropdown */}
          <div className="relative">
            <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest ml-1 mb-1.5 block">
              Enter Instagram Handle
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined text-[18px]">
                alternate_email
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('enterUsername')}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3 pl-10 pr-4 text-on-surface font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                onFocus={() => usernameHistory.length > 0 && setShowHistoryDropdown(true)}
                disabled={isScanning}
              />
            </div>

            {showHistoryDropdown && usernameHistory.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-lg max-h-40 overflow-y-auto"
              >
                <div className="flex justify-between items-center px-3 py-2 border-b border-outline-variant/10">
                  <span className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest">{t('recent')}</span>
                  <button
                    onClick={async () => {
                      await clearUsernameHistory();
                      setUsernameHistory([]);
                      setShowHistoryDropdown(false);
                    }}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    {t('clear')}
                  </button>
                </div>
                {usernameHistory.map((username, index) => (
                  <button
                    key={index}
                    onClick={() => { setTargetUsername(username); setShowHistoryDropdown(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-container-low text-on-surface text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-[15px]">history</span>
                    @{username}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* scan button */}
          <button
            onClick={handleStartCrawl}
            disabled={isScanning}
            className={`w-full py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer
              ${isScanning
                ? 'bg-primary/10 text-primary cursor-not-allowed'
                : 'bg-brand-gradient text-on-primary shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]'
              }`}
          >
            <span className={`material-symbols-outlined text-[18px] ${isScanning ? 'animate-spin' : ''}`}
              style={{ fontVariationSettings: isScanning ? undefined : "'FILL' 1" }}>
              {isScanning ? 'sync' : 'auto_awesome'}
            </span>
            {isScanning ? t('scanningBtn') : t('autoScan')}
          </button>
        </div>

        {/* ── Curator Status (mini info card) ─────────────────────────────── */}
        <div className="bg-surface-container-low rounded-[1.25rem] p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-on-surface text-sm">Curator Status</h3>
            <span className="text-[10px] font-semibold text-on-surface-variant">
              {stats.lastUpdated ? `Updated: ${stats.lastUpdated}` : t('noDataYet')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-lowest p-3 rounded-xl flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-full text-primary">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight">Speed</p>
                <p className="text-xs font-extrabold text-on-surface">Ultra</p>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-3 rounded-xl flex items-center gap-2.5">
              <div className="bg-tertiary/10 p-1.5 rounded-full text-tertiary">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-tight">Quality</p>
                <p className="text-xs font-extrabold text-on-surface">Lossless</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            to="/stats?tab=mutual"
            icon="group"
            count={stats.mutualCount}
            label={t('mutualFriends')}
            colorClass="text-blue-600"
            iconBg="bg-blue-50"
          />
          <StatCard
            to="/stats?tab=lost"
            icon="person_remove"
            count={stats.lostFollowersCount}
            label={t('lostFollowers')}
            colorClass="text-red-600"
            iconBg="bg-red-50"
          />
          <StatCard
            to="/stats?tab=new"
            icon="person_add"
            count={stats.newFollowersCount}
            label={t('newFollowers')}
            colorClass="text-green-600"
            iconBg="bg-green-50"
          />
          <StatCard
            to="/stats?tab=notfollowing"
            icon="person_search"
            count={stats.notFollowingBackCount}
            label={t('notFollowingBack')}
            colorClass="text-orange-600"
            iconBg="bg-orange-50"
          />
        </div>
      </div>
    </>
  );
};

export default Dashboard;