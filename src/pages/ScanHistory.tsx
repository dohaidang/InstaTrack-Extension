import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

interface SnapshotEntry {
  date: string;
  followerCount: number;
  followingCount: number;
  newCount: number;
  lostCount: number;
}

const ScanHistory = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [history, setHistory] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    
    // Listen for storage changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && (changes.snapshots || changes.diffs)) {
        loadHistory();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const loadHistory = async () => {
    try {
      const result = await chrome.storage.local.get(['snapshots', 'diffs']);
      const snapshots = result.snapshots || {};
      const diffs = result.diffs || {};

      // Convert to array and sort by date (newest first)
      const entries: SnapshotEntry[] = Object.keys(snapshots)
        .map(date => ({
          date,
          followerCount: snapshots[date]?.followers?.length || 0,
          followingCount: snapshots[date]?.following?.length || 0,
          newCount: diffs[date]?.newFollowers?.length || diffs[date]?.counts?.new || 0,
          lostCount: diffs[date]?.lostFollowers?.length || diffs[date]?.counts?.lost || 0,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(entries);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      await chrome.storage.local.remove(['snapshots', 'diffs', 'lastSnapshotDate']);
      setHistory([]);
    }
  };

  return (
    <div className="pb-24 bg-lux-bg text-lux-text-primary min-h-screen">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 bg-lux-bg/80 backdrop-blur-md border-b border-lux-glass-border">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-lux-text-primary/5 border border-transparent hover:border-lux-text-primary/10 rounded-full transition-colors text-lux-text-primary"
          >
            <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <h2 className="text-lux-text-primary text-base font-extrabold leading-tight tracking-tight flex-1 text-center">{t('scanHistory')}</h2>
          <div className="flex w-10 justify-end">
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="flex size-10 cursor-pointer items-center justify-center text-[#EF4444] hover:bg-lux-text-primary/5 border border-transparent hover:border-lux-text-primary/10 rounded-full transition-colors"
                title={t('clearHistory')}
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mb-3"></div>
            <p className="text-lux-text-secondary text-xs font-semibold">Loading history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 glass-card rounded-2xl p-6 border border-lux-glass-border">
            <div className="size-12 rounded-full bg-lux-text-primary/5 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-2xl text-lux-text-secondary/40">history</span>
            </div>
            <p className="text-lux-text-secondary text-xs font-bold text-center">{t('noHistory')}</p>
            <p className="text-lux-text-secondary/50 text-[10px] mt-1 text-center font-medium">
              Run your first scan to see history here
            </p>
          </div>
        )}

        {/* History List */}
        {!loading && history.length > 0 && (
          <div className="flex flex-col gap-3">
            {history.map((entry, index) => (
              <HistoryCard 
                key={entry.date}
                date={formatDate(entry.date)}
                time={formatTime(entry.date)}
                followerCount={entry.followerCount}
                followingCount={entry.followingCount}
                newCount={entry.newCount}
                lostCount={entry.lostCount}
                isLatest={index === 0}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && history.length > 0 && (
          <div className="mt-6 p-4 glass-card rounded-xl border border-lux-glass-border text-center">
            <p className="text-[11px] text-lux-text-secondary font-bold">
              Total {history.length} {t('scanned')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryCard = ({ 
  date, 
  time, 
  followerCount, 
  followingCount, 
  newCount, 
  lostCount,
  isLatest 
}: { 
  date: string; 
  time: string; 
  followerCount: number; 
  followingCount: number; 
  newCount: number; 
  lostCount: number;
  isLatest: boolean;
}) => {
  const { t } = useLanguage();
  return (
    <div className={`glass-card p-4 rounded-xl flex flex-col gap-3 border ${
      isLatest ? 'border-[#E1306C]/30 shadow-[0_0_15px_rgba(225,48,108,0.05)]' : 'border-lux-glass-border'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#E1306C] text-lg">calendar_today</span>
          <div>
            <p className="text-lux-text-primary text-xs font-extrabold leading-none">{date}</p>
            <p className="text-[9px] text-lux-text-secondary/60 font-semibold mt-1">{time}</p>
          </div>
        </div>
        {isLatest && (
          <span className="px-2 py-0.5 bg-[#E1306C]/10 border border-[#E1306C]/20 text-[#E1306C] text-[9px] font-black uppercase rounded-full">
            Latest
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2 border-t border-lux-glass-border pt-3">
        <div className="text-center p-2 bg-lux-text-primary/[0.02] rounded-lg border border-lux-glass-border">
          <p className="text-sm font-black text-lux-text-primary">{followerCount}</p>
          <p className="text-[8px] text-lux-text-secondary/60 font-bold uppercase tracking-wider mt-0.5">{t('followers')}</p>
        </div>
        <div className="text-center p-2 bg-lux-text-primary/[0.02] rounded-lg border border-lux-glass-border">
          <p className="text-sm font-black text-lux-text-primary">{followingCount}</p>
          <p className="text-[8px] text-lux-text-secondary/60 font-bold uppercase tracking-wider mt-0.5">{t('following')}</p>
        </div>
        <div className="text-center p-2 bg-[#22C55E]/5 rounded-lg border border-[#22C55E]/10">
          <p className="text-sm font-black text-[#22C55E]">+{newCount}</p>
          <p className="text-[8px] text-[#22C55E]/70 font-bold uppercase tracking-wider mt-0.5">{t('new')}</p>
        </div>
        <div className="text-center p-2 bg-[#EF4444]/5 rounded-lg border border-[#EF4444]/10">
          <p className="text-sm font-black text-[#EF4444]">{lostCount > 0 ? `-${lostCount}` : 0}</p>
          <p className="text-[8px] text-[#EF4444]/70 font-bold uppercase tracking-wider mt-0.5">{t('lost')}</p>
        </div>
      </div>
    </div>
  );
};

export default ScanHistory;