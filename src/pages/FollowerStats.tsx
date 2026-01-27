import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

const FollowerStats = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Lost');

  const tabs = ['Mutual', 'Lost', 'New', 'Not Following Back'];

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
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">{tab}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Today Group */}
        <h3 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-6">Today</h3>
        <div className="flex flex-col gap-3">
          <UserCard 
            username="wanderlust_jade" 
            name="Jade Thompson" 
            img="https://picsum.photos/201" 
            type="Lost" 
          />
          <UserCard 
            username="pixel_architect" 
            name="Marcus Lee" 
            img="https://picsum.photos/202" 
            type="Lost" 
          />
        </div>

        {/* Yesterday Group */}
        <h3 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-6">Yesterday</h3>
        <div className="flex flex-col gap-3">
          <UserCard 
            username="dev_logic_" 
            name="Samuel Rickman" 
            img="https://picsum.photos/203" 
            type="Following" 
          />
        </div>

        {/* Date Group */}
        <h3 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-6">Oct 24, 2023</h3>
        <div className="flex flex-col gap-3">
          <UserCard 
            username="minimal_shots" 
            name="Sarah Jenkins" 
            img="https://picsum.photos/204" 
            type="NotFollowing" 
          />
           <UserCard 
            username="urban_vibe" 
            name="Chris O'Connell" 
            img="https://picsum.photos/205" 
            type="Following" 
          />
        </div>
      </div>
    </div>
  );
};

const UserCard = ({ username, name, img, type }: { username: string, name: string, img: string, type: 'Lost' | 'Following' | 'NotFollowing' }) => {
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-white/5 px-4 min-h-[72px] py-3 justify-between rounded-lg shadow-sm border border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={img} size="md" hasStory={type === 'Lost'} />
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
        {type === 'Following' ? (
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-9 px-4 bg-[#f4f0f2] dark:bg-white/10 text-[#181114] dark:text-white text-sm font-medium leading-normal w-fit">
            <span className="truncate">Unfollow</span>
          </button>
        ) : (
          <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-9 px-4 bg-primary text-white text-sm font-semibold leading-normal w-fit shadow-md shadow-primary/20">
            <span className="truncate">Follow</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FollowerStats;