import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFollowerData } from '../hooks/useFollowerData';
import Avatar from '../components/Avatar';
import { useLanguage } from '../hooks/useLanguage';
import { exportToCsv } from '../utils/exportCsv';

interface Follower {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
}

type TabType = 'Mutual' | 'Lost' | 'New' | 'Not Following Back';

const FollowerStats = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { stats, loading } = useFollowerData();
  const { t } = useLanguage();
  
  // Get initial tab from URL query param
  const getInitialTab = (): TabType => {
    const tabParam = searchParams.get('tab');
    switch (tabParam) {
      case 'lost': return 'Lost';
      case 'new': return 'New';
      case 'notfollowing': return 'Not Following Back';
      default: return 'Mutual';
    }
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [searchQuery, setSearchQuery] = useState('');

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [searchParams]);

  const categories: TabType[] = ['Mutual', 'Lost', 'New', 'Not Following Back'];

  // Get current list based on active tab
  const getCurrentList = (): Follower[] => {
    switch (activeTab) {
      case 'Mutual': return stats.mutualList || [];
      case 'Lost': return stats.lostFollowersList || [];
      case 'New': return stats.newFollowersList || [];
      case 'Not Following Back': return stats.notFollowingBackList || [];
      default: return [];
    }
  };

  const currentList = getCurrentList();

  // Filter list by search query
  const filteredList = currentList.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // Get tab count for badge
  const getTabCount = (tab: string): number => {
    switch (tab) {
      case 'Mutual': return stats.mutualCount || 0;
      case 'Lost': return stats.lostFollowersCount || 0;
      case 'New': return stats.newFollowersCount || 0;
      case 'Not Following Back': return stats.notFollowingBackCount || 0;
      default: return 0;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'Mutual': return t('mutual');
      case 'Lost': return t('lost');
      case 'New': return t('new');
      case 'Not Following Back': return t('notFollowing');
      default: return tab;
    }
  };

  // Export CSV handler
  const handleExport = () => {
    if (filteredList.length === 0) return;
    const filename = `instagram_${activeTab.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    exportToCsv(filteredList, filename, activeTab);
  };

  return (
    <div className="pb-24 pt-4 min-h-screen bg-[#0B1020] text-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-[#0B1020]/80 backdrop-blur-md border-b border-white/[0.06] -mt-4 mb-4">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full transition-colors text-[#F8FAFC]"
          >
            <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <h2 className="text-[#F8FAFC] text-base font-extrabold leading-tight tracking-tight flex-1 text-center">{t('followerStats')}</h2>
          <button 
            onClick={handleExport}
            disabled={filteredList.length === 0}
            className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[#F8FAFC]"
            title={t('exportCsv')}
          >
            <span className="material-symbols-outlined text-xl">download</span>
          </button>
        </div>
      </div>

      <div className="px-4">
        {/* Chips/Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => {
            const active = activeTab === cat;
            const count = getTabCount(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2.5 rounded-full whitespace-nowrap text-xs font-bold transition-all duration-300 ${
                  active
                    ? 'bg-brand-gradient text-white shadow-md shadow-primary/25'
                    : 'bg-white/[0.04] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {getTabLabel(cat)}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  active ? 'bg-white/20 text-white' : 'bg-white/5 text-[#94A3B8]/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]/40 text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#F8FAFC] placeholder-[#94A3B8]/30 focus:outline-none focus:ring-1 focus:ring-[#E1306C]/50 focus:border-[#E1306C]/50 transition-all text-xs font-semibold"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent mb-3"></div>
                <p className="text-[#94A3B8] text-xs font-semibold">{t('scanningBtn')}</p>
             </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredList.map((user) => (
              <UserCard 
                key={user.id || user.username}
                username={user.username} 
                name={user.fullName || user.username} 
                img={user.avatarUrl} 
                type={activeTab === 'Lost' ? 'Lost' : activeTab === 'Not Following Back' ? 'NotFollowing' : 'Following'} 
              />
            ))}
            {filteredList.length === 0 && (
                <div className="text-center py-16 glass-card rounded-2xl border border-white/[0.04] p-6">
                    <div className="bg-white/5 size-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-2xl text-[#94A3B8]/40">{searchQuery ? 'search_off' : 'inbox'}</span>
                    </div>
                    <p className="text-[#94A3B8] text-xs font-semibold">{searchQuery ? t('noResults') : t('noDataYet')}</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const UserCard = ({ username, name, img, type }: { username: string, name: string, img: string, type: 'Lost' | 'Following' | 'NotFollowing' }) => {
  const { t } = useLanguage();
  
  const handleAction = () => {
    window.open(`https://www.instagram.com/${username}/`, '_blank');
  };

  return (
    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] px-3.5 min-h-[64px] py-2.5 justify-between rounded-xl transition-all duration-300">
      <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={handleAction}>
        <div className="relative shrink-0">
          <Avatar src={img || ''} username={username} size="sm" hasStory={type === 'Lost'} />
          {type === 'Lost' && (
             <div className="absolute -bottom-1 -right-1 bg-[#EF4444] rounded-full p-0.5 border border-[#0B1020] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[10px] font-bold">person_remove</span>
             </div>
          )}
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="text-[#F8FAFC] text-xs font-extrabold truncate leading-tight">@{username}</p>
          <p className="text-[#94A3B8] text-[10px] font-medium truncate mt-0.5">{name}</p>
        </div>
      </div>
      <div className="shrink-0">
        <button 
          onClick={handleAction}
          className={`flex min-w-[72px] cursor-pointer items-center justify-center rounded-lg h-8 px-3 text-xs font-bold transition-all duration-200
            ${type === 'Following' 
              ? 'border border-white/10 text-[#F8FAFC] hover:bg-white/5' 
              : 'bg-brand-gradient text-white shadow-sm shadow-[#E1306C]/10 hover:opacity-90 active:scale-[0.98]'
            }`}
        >
          <span>{t('view')}</span>
        </button>
      </div>
    </div>
  );
};

export default FollowerStats;