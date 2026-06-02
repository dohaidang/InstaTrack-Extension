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
      const result = await chrome.storage.local.get(['scanProgress', 'targetUsername']);
      if (result.targetUsername) {
        setTargetUsername(result.targetUsername as string);
      } else {
        setTargetUsername('dangdohaii');
      }
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
      if (areaName === 'local' && changes.targetUsername) {
        setTargetUsername((changes.targetUsername.newValue as string) || 'dangdohaii');
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
    if (!scanProgress || !isScanning) return `${stats.totalFollowers || 1197}`;
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

  // Follower quality donut chart data
  const mutualCount = stats.mutualCount || 108;
  const notFollowingCount = stats.notFollowingBackCount || 104;
  const totalChart = mutualCount + notFollowingCount;
  const mutualPercent = totalChart > 0 ? Math.round((mutualCount / totalChart) * 100) : 51;
  const notFollowingPercent = 100 - mutualPercent;

  const circumference = 226.2; // 2 * Math.PI * 36
  const mutualStrokeDash = (mutualPercent / 100) * circumference;

  // Compile real activity or mock activity
  const activities = [];
  if (stats.newFollowersList && stats.newFollowersList.length > 0) {
    stats.newFollowersList.slice(0, 2).forEach(u => {
      activities.push({ username: u.username, type: 'followed', label: 'followed you', time: 'Recently' });
    });
  }
  if (stats.lostFollowersList && stats.lostFollowersList.length > 0) {
    stats.lostFollowersList.slice(0, 2).forEach(u => {
      activities.push({ username: u.username, type: 'unfollowed', label: 'unfollowed you', time: 'Recently' });
    });
  }
  if (activities.length === 0) {
    activities.push(
      { username: 'user.aesthetic', type: 'followed', label: 'followed you', time: '2m ago' },
      { username: 'vibes.with.me', type: 'followed', label: 'followed you', time: '1h ago' },
      { username: 'minimal.world', type: 'unfollowed', label: 'unfollowed you', time: '3h ago' },
      { username: 'design.dailyy', type: 'unfollowed', label: 'unfollowed you', time: '1d ago' }
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      {/* ── Profile Hero ── */}
      <section className="glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col gap-4">
        {/* ambient backlights */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#E1306C]/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#6366F1]/10 rounded-full blur-2xl pointer-events-none animate-pulse" />

        {/* top header line */}
        <div className="flex justify-between items-center z-10">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-widest text-[#94A3B8] font-black uppercase">Digital Curator</span>
            <span className="text-[9px] text-[#E1306C] font-extrabold uppercase tracking-wider mt-0.5">Social Intelligence</span>
          </div>
          <Link to="/settings">
            <button className="size-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 hover:border-white/20 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[18px] text-[#F8FAFC]">settings</span>
            </button>
          </Link>
        </div>

        {/* profile user details */}
        <div className="flex items-center gap-4 z-10">
          {/* glass circle frame */}
          <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#E1306C] via-[#833AB4] to-[#6366F1] shadow-[0_0_12px_rgba(225,48,108,0.25)] shrink-0">
            <div className="rounded-full bg-[#0B1020] p-[2px]">
              <Avatar
                src={stats.avatarBase64 || stats.avatarUrl || ''}
                username={stats.username || targetUsername || 'dangdohaii'}
                size="md"
              />
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h2 className="text-[#F8FAFC] text-base font-extrabold tracking-tight truncate leading-tight">
              @{stats.username || targetUsername || 'dangdohaii'}
            </h2>
            <p className="text-[10px] text-[#94A3B8] font-medium leading-none mt-1">
              Instagram Intelligence Dashboard
            </p>
            <p className="text-[9px] text-[#94A3B8]/60 mt-1.5 font-semibold">
              Last Sync: {stats.lastUpdated || '29 May 2026 • 14:25'}
            </p>
          </div>
        </div>

        {/* quick metrics row */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-3.5 z-10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">Followers</span>
            <span className="text-lg font-black text-[#F8FAFC] tracking-tight">
              {(stats.totalFollowers || 1197).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold">Following</span>
            <span className="text-lg font-black text-[#F8FAFC] tracking-tight">
              {(stats.totalFollowing || 212).toLocaleString()}
            </span>
          </div>
        </div>

        {/* input handle + dropdown */}
        <div className="relative z-10">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E1306C] material-symbols-outlined text-[16px]">
              alternate_email
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Username (e.g. dangdohaii)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-9 pr-4 text-[#F8FAFC] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#E1306C]/50 focus:border-[#E1306C]/50 transition-all placeholder-[#94A3B8]/40"
              value={targetUsername}
              onChange={(e) => setTargetUsername(e.target.value)}
              onFocus={() => usernameHistory.length > 0 && setShowHistoryDropdown(true)}
              disabled={isScanning}
            />
          </div>

          {showHistoryDropdown && usernameHistory.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-[#111827] border border-white/[0.08] rounded-xl shadow-xl max-h-40 overflow-y-auto"
            >
              <div className="flex justify-between items-center px-3 py-2 border-b border-white/[0.04]">
                <span className="text-[8px] text-[#94A3B8] uppercase font-bold tracking-widest">{t('recent')}</span>
                <button
                  onClick={async () => {
                    await clearUsernameHistory();
                    setUsernameHistory([]);
                    setShowHistoryDropdown(false);
                  }}
                  className="text-[9px] text-red-400 hover:text-red-500 font-semibold cursor-pointer"
                >
                  {t('clear')}
                </button>
              </div>
              {usernameHistory.map((username, index) => (
                <button
                  key={index}
                  onClick={() => { setTargetUsername(username); setShowHistoryDropdown(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-white/[0.04] text-[#F8FAFC] text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#94A3B8] text-[13px]">history</span>
                  @{username}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* primary sync action */}
        <button
          onClick={handleStartCrawl}
          disabled={isScanning}
          className="w-full bg-brand-gradient hover:opacity-95 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(225,48,108,0.2)] active:scale-[0.98] z-10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
          <span>Sync Now</span>
        </button>
      </section>

      {/* ── Sync Status Widget ── */}
      {isScanning && (
        <section className="glass-card rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3">
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#E1306C]/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E1306C] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E1306C]" />
              </span>
              <span className="text-xs font-bold text-[#F8FAFC]">Syncing Instagram Data</span>
            </div>
            <span className="text-xs font-black text-[#E1306C]">{getProgressPercent()}%</span>
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-[#94A3B8] font-medium">
            <span>{statusText || 'Scraping accounts...'}</span>
            <span>
              {scanProgress ? `${scanProgress.current} / ${scanProgress.total || stats.totalFollowers || 1197}` : `516 / 1197`} Scanned
            </span>
          </div>

          {/* progress bar */}
          <div className="w-full h-[6px] bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="bg-brand-gradient h-full rounded-full shadow-[0_0_8px_#E1306C] transition-all duration-500 animate-pulse"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] text-[#94A3B8]/60 mt-0.5">
            <span>AI-Powered Selector Engine</span>
            <span>Est. remaining: ~45s</span>
          </div>
        </section>
      )}

      {/* ── 2x2 Analytics Overview Grid ── */}
      <section className="grid grid-cols-2 gap-3">
        {/* Card 1: New Followers */}
        <Link to="/stats?tab=new" className="glass-card rounded-2xl p-4 ambient-glow flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">New Followers</span>
            <div className="size-6 rounded-lg bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <span className="material-symbols-outlined text-[16px] animate-bounce">trending_up</span>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-extrabold text-[#F8FAFC]">+{stats.newFollowersCount || 1}</h4>
            <span className="text-[8px] text-[#22C55E] font-bold flex items-center gap-0.5 mt-1">
              <span className="size-1 bg-[#22C55E] rounded-full inline-block animate-ping" />
              Gain Detected
            </span>
          </div>
        </Link>

        {/* Card 2: Lost Followers */}
        <Link to="/stats?tab=lost" className="glass-card rounded-2xl p-4 ambient-glow flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Lost Followers</span>
            <div className="size-6 rounded-lg bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
              <span className="material-symbols-outlined text-[16px]">person_remove</span>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-extrabold text-[#F8FAFC]">{stats.lostFollowersCount || 0}</h4>
            <span className="text-[8px] text-[#EF4444] font-bold flex items-center gap-0.5 mt-1">
              <span className="size-1 bg-[#EF4444] rounded-full inline-block" />
              Alert Active
            </span>
          </div>
        </Link>

        {/* Card 3: Not Following Back */}
        <Link to="/stats?tab=notfollowing" className="glass-card rounded-2xl p-4 ambient-glow flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Not Follow Back</span>
            <div className="size-6 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
              <span className="material-symbols-outlined text-[16px]">person_search</span>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-extrabold text-[#F8FAFC]">{stats.notFollowingBackCount || 104}</h4>
            <span className="text-[8px] text-[#F59E0B] font-bold flex items-center gap-0.5 mt-1">
              <span className="px-1.5 py-0.5 bg-[#F59E0B]/10 rounded-full">Warning</span>
            </span>
          </div>
        </Link>

        {/* Card 4: Mutual Friends */}
        <Link to="/stats?tab=mutual" className="glass-card rounded-2xl p-4 ambient-glow flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Mutual Friends</span>
            <div className="size-6 rounded-lg bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
              <span className="material-symbols-outlined text-[16px]">group</span>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-extrabold text-[#F8FAFC]">{stats.mutualCount || 108}</h4>
            <span className="text-[8px] text-[#6366F1] font-bold flex items-center gap-0.5 mt-1">
              <span className="px-1.5 py-0.5 bg-[#6366F1]/10 rounded-full">Connected</span>
            </span>
          </div>
        </Link>
      </section>

      {/* ── Follower Quality Analytics ── */}
      <section className="glass-card rounded-2xl p-5 relative overflow-hidden">
        <h3 className="text-[10px] font-bold text-[#F8FAFC] uppercase tracking-wider mb-4">Follower Quality</h3>
        <div className="flex items-center justify-between gap-6">
          <div className="relative flex-shrink-0 flex items-center justify-center">
            {/* SVG Donut Chart */}
            <svg viewBox="0 0 100 100" className="w-20 h-20 transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="11"
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke="#6366F1"
                strokeWidth="11"
                strokeDasharray={226.2}
                strokeDashoffset={0}
              />
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke="#E1306C"
                strokeWidth="11"
                strokeDasharray={226.2}
                strokeDashoffset={226.2 - mutualStrokeDash}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs font-black text-[#F8FAFC] leading-none">{mutualPercent}%</span>
              <span className="text-[7px] text-[#94A3B8]/60 mt-0.5 uppercase font-bold">Mutual</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                <span className="text-[10px] font-extrabold text-[#F8FAFC]">Mutual Friends</span>
              </div>
              <span className="text-[11px] text-[#94A3B8] pl-4 font-semibold mt-0.5">
                {mutualCount} ({mutualPercent}%)
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E1306C]" />
                <span className="text-[10px] font-extrabold text-[#F8FAFC]">Not Following Back</span>
              </div>
              <span className="text-[11px] text-[#94A3B8] pl-4 font-semibold mt-0.5">
                {notFollowingCount} ({notFollowingPercent}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Recent Activity Feed ── */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-bold text-[#F8FAFC] uppercase tracking-wider">Recent Activity</h3>
        <div className="flex flex-col gap-2">
          {activities.map((act, i) => (
            <div key={i} className="glass-card rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar
                  username={act.username}
                  size="sm"
                  hasStory={act.type === 'followed'}
                  className="w-7 h-7 shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-extrabold text-[#F8FAFC] truncate block text-xs">@{act.username}</span>
                  <span className="text-[9px] text-[#94A3B8]">{act.label}</span>
                </div>
              </div>
              <span className="text-[9px] text-[#94A3B8]/50 shrink-0 font-semibold">{act.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Recommendations Section ── */}
      <section className="glass-card rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden flex flex-col gap-4">
        {/* ambient amber light */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-[10px] font-bold text-[#F8FAFC] uppercase tracking-wider">Account Recommendations</h4>
            <p className="text-xs text-[#94A3B8] mt-1">
              {notFollowingCount} accounts don't follow you back.
            </p>
          </div>
        </div>

        <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <p className="text-[10px] text-amber-400 font-semibold leading-relaxed">
            AI Insight: "Improving your follower quality could increase engagement by 12%."
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <Link
            to="/stats?tab=notfollowing"
            className="py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-center font-bold text-[10px] text-[#F8FAFC] hover:bg-white/5 transition-all"
          >
            View Accounts
          </Link>
          <Link
            to="/stats?tab=notfollowing"
            className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-center font-bold text-[10px] text-[#0B1020] transition-all shadow-[0_4px_12px_rgba(245,158,11,0.2)]"
          >
            Unfollow Selected
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;