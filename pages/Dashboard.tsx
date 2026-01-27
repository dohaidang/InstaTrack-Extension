import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';

const StatCard = ({ icon, count, label, colorClass, iconBg }: { icon: string, count: string, label: string, colorClass: string, iconBg: string }) => (
  <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-col gap-3">
    <div className={`size-10 rounded-lg ${iconBg} flex items-center justify-center ${colorClass}`}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-[#181114] dark:text-white">{count}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  </div>
);

const Dashboard = () => {
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
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">@the_creative_coder</h2>
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
              <p className="text-xl font-bold">1,190</p>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">Followers</p>
            </div>
            <Avatar 
              src="https://picsum.photos/200" 
              size="lg"
              className="border-4 border-transparent" // Adjust if needed
            />
            <div className="flex flex-col items-center text-white">
              <p className="text-xl font-bold">850</p>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">Following</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-4 -mt-4 relative z-20 pb-10">
        {/* Fetching Card */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-lg border border-gray-100 dark:border-white/10 p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-[#181114] dark:text-white text-base font-bold leading-tight">Fetching followers...</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">@the_creative_coder</p>
            </div>
            <div className="flex gap-2">
              <div className="bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full flex items-center gap-1.5 border border-gray-200 dark:border-white/10">
                <span className="material-symbols-outlined text-[14px] text-gray-400">speed</span>
                <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">1s/req</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-insta-orange text-sm font-bold">646 <span className="text-gray-400 font-normal">/ 1,190</span></p>
              <p className="text-insta-orange text-sm font-bold">54%</p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-insta-yellow to-insta-orange h-full rounded-full transition-all" style={{ width: '54%' }}></div>
            </div>
          </div>
          
          <button className="w-full py-3 bg-insta-orange/10 hover:bg-insta-orange/20 text-insta-orange rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
            <span className="material-symbols-outlined">pause_circle</span>
            Pause Fetching
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/stats">
            <StatCard icon="group" count="432" label="Mutual friends" colorClass="text-blue-500" iconBg="bg-blue-50 dark:bg-blue-900/20" />
          </Link>
          <Link to="/stats">
            <StatCard icon="person_remove" count="12" label="Lost followers" colorClass="text-red-500" iconBg="bg-red-50 dark:bg-red-900/20" />
          </Link>
          <Link to="/stats">
            <StatCard icon="person_add" count="84" label="New followers" colorClass="text-green-500" iconBg="bg-green-50 dark:bg-green-900/20" />
          </Link>
          <Link to="/stats">
            <StatCard icon="person_search" count="215" label="Not following back" colorClass="text-orange-500" iconBg="bg-orange-50 dark:bg-orange-900/20" />
          </Link>
        </div>

        {/* Detailed Analysis Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#181114] dark:text-white text-lg font-bold leading-tight">Quick Actions</h3>
            <button className="text-primary text-sm font-bold">See All</button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#181114] dark:text-white">Profile Engagement</p>
                  <p className="text-xs text-gray-500">Analyze your recent post reach</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-insta-yellow/20 flex items-center justify-center text-insta-orange">
                  <span className="material-symbols-outlined">stars</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#181114] dark:text-white">Ghost Followers</p>
                  <p className="text-xs text-gray-500">Identify inactive accounts</p>
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