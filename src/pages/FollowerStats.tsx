import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFollowerData } from '../hooks/useFollowerData';
import Avatar from '../components/Avatar';
import { useLanguage } from '../hooks/useLanguage';

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

  return (
    <div className="pb-24 pt-4 min-h-screen bg-white dark:bg-background-dark">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 -mt-4 mb-4">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <div onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl text-[#181114] dark:text-white">arrow_back_ios_new</span>
          </div>
          <h2 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">{t('followerStats')}</h2>
        </div>
      </div>

      <div className="px-4">
        {/* Chips/Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                activeTab === cat
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {getTabLabel(cat)}
              <span className={`ml-2 text-xs opacity-80 ${activeTab === cat ? 'text-white' : 'text-gray-400'}`}>
                {getTabCount(cat)}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-400 text-sm mt-3">{t('scanningBtn')}</p>
             </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentList.map((user) => (
              <UserCard 
                key={user.id || user.username}
                username={user.username} 
                name={user.fullName || user.username} 
                img={user.avatarUrl} 
                type={activeTab === 'Lost' ? 'Lost' : activeTab === 'Not Following Back' ? 'NotFollowing' : 'Following'} 
              />
            ))}
            {currentList.length === 0 && (
                <div className="text-center py-12">
                    <div className="bg-gray-50 dark:bg-white/5 size-16 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-3xl text-gray-300">inbox</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">{t('noDataYet')}</p>
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
    // Open Instagram profile in new tab
    window.open(`https://www.instagram.com/${username}/`, '_blank');
  };

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-white/5 px-4 min-h-[72px] py-3 justify-between rounded-lg shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0 overflow-hidden" onClick={handleAction}>
        <div className="relative shrink-0">
          <Avatar src={img || ''} username={username} size="md" hasStory={type === 'Lost'} />
          {type === 'Lost' && (
             <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white dark:border-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px] font-bold">person_remove</span>
             </div>
          )}
        </div>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="text-[#181114] dark:text-white text-base font-bold leading-normal truncate">{username}</p>
          <p className="text-[#896175] dark:text-white/60 text-sm font-normal leading-normal truncate">{name}</p>
        </div>
      </div>
      <div className="shrink-0">
        <button 
          onClick={handleAction}
          className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-9 px-4 ${
            type === 'Following' 
              ? 'bg-[#f4f0f2] dark:bg-white/10 text-[#181114] dark:text-white' 
              : 'bg-primary text-white shadow-md shadow-primary/20'
          } text-sm font-medium leading-normal w-fit`}
        >
          <span className="truncate">{t('view')}</span>
        </button>
      </div>
    </div>
  );
};

export default FollowerStats;