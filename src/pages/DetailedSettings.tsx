import React from 'react';
import { useNavigate } from 'react-router-dom';

const Toggle = ({ defaultChecked = false }: { defaultChecked?: boolean }) => (
  <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none bg-gray-200 dark:bg-white/20 p-0.5 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all duration-200">
    <div className="h-full w-[27px] rounded-full bg-white shadow-md"></div>
    <input defaultChecked={defaultChecked} className="invisible absolute" type="checkbox" />
  </label>
);

const DetailedSettings = () => {
  const navigate = useNavigate();

  return (
    <div className="pb-12 pt-4">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-white/10 -mt-4 mb-4">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <div onClick={() => navigate(-1)} className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl text-[#181114] dark:text-white">arrow_back_ios_new</span>
          </div>
          <h2 className="text-[#181114] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">Settings</h2>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Section: General */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#896172] dark:text-primary/70 px-4 pb-2">General</h3>
          <div className="bg-white dark:bg-white/5 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            {/* Language */}
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined text-[24px]">translate</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Language</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[#896172] dark:text-gray-400 text-sm">English</p>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">chevron_right</span>
              </div>
            </div>
            {/* Timezone */}
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined text-[24px]">schedule</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Auto-detect Timezone</p>
                </div>
              </div>
              <Toggle defaultChecked />
            </div>
          </div>
        </section>

        {/* Section: Scanning */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#896172] dark:text-primary/70 px-4 pb-2">Scanning</h3>
          <div className="bg-white dark:bg-white/5 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            {/* Auto-scan frequency */}
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined text-[24px]">refresh</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Auto-scan Frequency</p>
                  <p className="text-[#896172] dark:text-gray-400 text-xs">Every 6 hours</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 text-[20px]">chevron_right</span>
            </div>
            {/* Request Speed */}
            <div className="flex flex-col gap-2 px-4 py-4 border-b border-gray-50 dark:border-white/5">
              <div className="flex items-center gap-4 justify-between mb-1">
                <div className="flex items-center gap-4">
                  <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                    <span className="material-symbols-outlined text-[24px]">speed</span>
                  </div>
                  <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Request Speed</p>
                </div>
                <span className="text-primary text-sm font-semibold">Medium</span>
              </div>
              <input className="w-full h-1.5 bg-gray-200 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary" max="3" min="1" type="range" defaultValue="2" />
              <div className="flex justify-between text-[10px] text-[#896172] px-1">
                <span>SAFE</span>
                <span>BALANCED</span>
                <span>FAST</span>
              </div>
            </div>
            {/* Concurrent Requests */}
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between hover:bg-gray-50 dark:hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined text-[24px]">layers</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Concurrent Requests</p>
                  <p className="text-[#896172] dark:text-gray-400 text-xs">Simultaneous account scans</p>
                </div>
              </div>
              <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-full px-1 py-1">
                <button className="size-8 flex items-center justify-center rounded-full text-[#181114] dark:text-white hover:bg-white dark:hover:bg-white/20 transition-all shadow-sm">-</button>
                <span className="px-3 font-semibold text-sm text-[#181114] dark:text-white">3</span>
                <button className="size-8 flex items-center justify-center rounded-full text-[#181114] dark:text-white hover:bg-white dark:hover:bg-white/20 transition-all shadow-sm">+</button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Notifications */}
        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#896172] dark:text-primary/70 px-4 pb-2">Notifications</h3>
          <div className="bg-white dark:bg-white/5 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between border-b border-gray-50 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined text-[24px]">notifications</span>
                </div>
                <p className="text-[#181114] dark:text-white text-base font-medium leading-normal">Push Notifications</p>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between border-b border-gray-50 dark:border-white/5">
              <div className="flex items-center gap-4 pl-14">
                <p className="text-[#181114] dark:text-white text-base font-normal leading-normal">New Follower Alerts</p>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between">
              <div className="flex items-center gap-4 pl-14">
                <p className="text-[#181114] dark:text-white text-base font-normal leading-normal">Lost Follower Alerts</p>
              </div>
              <Toggle defaultChecked />
            </div>
          </div>
        </section>
        
        {/* Version Info */}
        <div className="text-center pt-4 pb-10">
            <p className="text-[#896172] dark:text-gray-500 text-xs">FollowerTrack v1.0.0</p>
            <p className="text-[#896172] dark:text-gray-600 text-[10px] mt-1">Made with ❤️ for Instagram users</p>
        </div>
      </div>
    </div>
  );
};

export default DetailedSettings;