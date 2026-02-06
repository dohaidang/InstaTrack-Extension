import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { useFollowerData } from '../hooks/useFollowerData';

interface Follower {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
}

const FollowerStats = () => {
  const navigate = useNavigate();
  const { stats, loading } = useFollowerData();
  const [activeTab, setActiveTab] = useState<'Mutual' | 'Lost' | 'New' | 'Not Following Back'>('Mutual');

  const tabs: Array<'Mutual' | 'Lost' | 'New' | 'Not Following Back'> = ['Mutual', 'Lost', 'New', 'Not Following Back'];

  // Get current list based on active tab
  const getCurrentList = (): Follower[] => {
    switch (activeTab) {
      case 'Mutual':
        return stats.mutualList || [];
      case 'Lost':
        return stats.lostFollowersList || [];
      case 'New':
        return stats.newFollowersList || [];
      case 'Not Following Back':
        return stats.notFollowingBackList || [];
      default:
        return [];
    }
  };

  const currentList = getCurrentList();

  // Get tab count for badge
  const getTabCount = (tab: string): number => {
    switch (tab) {
      case 'Mutual':
        return stats.mutualCount || 0;
      case 'Lost':
        return stats.lostFollowersCount || 0;
      case 'New':
        return stats.newFollowersCount || 0;
      case 'Not Following Back':
        return stats.notFollowingBackCount || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="pb-20">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center p-4 pb-2 justify-between">
          <div onClick={() => navigate(-1)} className="text-[#181114] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer hover:opacity-70">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </div>
          <h2 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Follower Stats</h2>
          <div className="flex w-12 items-center justify-end">
            <button className="flex cursor-pointer items-center justify-center text-[#181114] dark:text-white">
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="pb-0 border-b border-[#e6dbe0] dark:border-white/10">
          <div className="flex overflow-x-auto no-scrollbar px-4 gap-6">
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 whitespace-nowrap transition-colors ${
                  activeTab === tab 
                  ? 'border-b-primary text-primary' 
                  : 'border-b-transparent text-[#896175] dark:text-white/60'
                }`}
              >
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                  {tab} {getTabCount(tab) > 0 && <span className="ml-1 text-xs opacity-70">({getTabCount(tab)})</span>}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && currentList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-gray-400">
                {activeTab === 'Lost' ? 'person_remove' : 
                 activeTab === 'New' ? 'person_add' : 
                 activeTab === 'Mutual' ? 'group' : 'person_search'}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {activeTab === 'Lost' && 'No lost followers yet'}
              {activeTab === 'New' && 'No new followers yet'}
              {activeTab === 'Mutual' && 'No mutual followers found'}
              {activeTab === 'Not Following Back' && 'Everyone you follow follows you back!'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 text-center">
              Run a scan to see your follower stats
            </p>
          </div>
        )}

        {/* User List */}
        {!loading && currentList.length > 0 && (
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
          </div>
        )}
      </div>
    </div>
  );
};

const UserCard = ({ username, name, img, type }: { username: string, name: string, img: string, type: 'Lost' | 'Following' | 'NotFollowing' }) => {
  const handleAction = () => {
    // Open Instagram profile in new tab
    window.open(`https://www.instagram.com/${username}/`, '_blank');
  };

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-white/5 px-4 min-h-[72px] py-3 justify-between rounded-lg shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-4 cursor-pointer" onClick={handleAction}>
        <div className="relative">
          <Avatar src={img || ''} username={username} size="md" hasStory={type === 'Lost'} />
          {type === 'Lost' && (
             <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-white dark:border-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px] font-bold">person_remove</span>
             </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[#181114] dark:text-white text-base font-bold leading-normal line-clamp-1">{username}</p>
          <p className="text-[#896175] dark:text-white/60 text-sm font-normal leading-normal line-clamp-1">{name}</p>
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
          <span className="truncate">View</span>
        </button>
      </div>
    </div>
  );
};

export default FollowerStats;