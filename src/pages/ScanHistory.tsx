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
    <div className="pb-20">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-4 justify-between border-b border-[#e6dbe0] dark:border-white/10">
          <div onClick={() => navigate(-1)} className="text-[#181114] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </div>
          <h2 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">{t('scanHistory')}</h2>
          <div className="flex w-12 items-center justify-end">
            {history.length > 0 && (
              <button 
                onClick={clearHistory}
                className="flex cursor-pointer items-center justify-center text-red-500 hover:text-red-600"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-gray-400">history</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center">{t('noHistory')}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 text-center">
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
          <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
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
    <div className={`bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border ${isLatest ? 'border-primary/30 dark:border-primary/30' : 'border-gray-100 dark:border-white/5'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <div>
            <p className="text-[#181114] dark:text-white font-bold">{date}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
          </div>
        </div>
        {isLatest && (
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Latest</span>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
          <p className="text-sm font-bold text-[#181114] dark:text-white">{followerCount}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('followers')}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
          <p className="text-sm font-bold text-[#181114] dark:text-white">{followingCount}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('following')}</p>
        </div>
        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-bold text-green-600 dark:text-green-400">+{newCount}</p>
          <p className="text-[10px] text-green-600/70 dark:text-green-400/70">{t('new')}</p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm font-bold text-red-500 dark:text-red-400">-{lostCount}</p>
          <p className="text-[10px] text-red-500/70 dark:text-red-400/70">{t('lost')}</p>
        </div>
      </div>
    </div>
  );
};

export default ScanHistory;