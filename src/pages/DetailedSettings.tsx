import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

const Toggle = ({ defaultChecked = false }: { defaultChecked?: boolean }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input 
      defaultChecked={defaultChecked} 
      className="sr-only peer" 
      type="checkbox" 
    />
    <div className="w-11 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#94A3B8] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E1306C] peer-checked:border-[#E1306C] peer-checked:after:bg-white"></div>
  </label>
);

const DetailedSettings = () => {
  const navigate = useNavigate();
  const { language, changeLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    changeLanguage(language === 'en' ? 'vi' : 'en');
  };

  return (
    <div className="pb-12 pt-4 bg-lux-bg text-lux-text-primary min-h-screen transition-colors duration-200">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-lux-bg/80 backdrop-blur-md border-b border-white/[0.06] -mt-4 mb-4">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 rounded-full transition-colors text-lux-text-primary"
          >
            <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
          </button>
          <h2 className="text-lux-text-primary text-base font-extrabold leading-tight tracking-tight flex-1 text-center pr-10">{t('settings')}</h2>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Section: General */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-lux-text-secondary/50 px-4 pb-2">{t('general')}</h3>
          <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.04]">
            {/* Language */}
            <div 
              onClick={toggleLanguage}
              className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between border-b border-white/[0.04] hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                  <span className="material-symbols-outlined text-[20px]">translate</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('language')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-lux-text-secondary text-xs font-semibold">
                  {language === 'en' ? 'English' : 'Tiếng Việt'}
                </p>
                <span className="material-symbols-outlined text-lux-text-secondary text-[18px]">swap_horiz</span>
              </div>
            </div>
            {/* Timezone */}
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between hover:bg-white/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                  <span className="material-symbols-outlined text-[20px]">schedule</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('autoDetectTimezone')}</p>
                </div>
              </div>
              <Toggle defaultChecked />
            </div>
          </div>
        </section>

        {/* Section: Scanning */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-lux-text-secondary/50 px-4 pb-2">{t('scanning')}</h3>
          <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.04]">
            {/* Auto-scan frequency */}
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between border-b border-white/[0.04] hover:bg-white/5 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('autoScanFrequency')}</p>
                  <p className="text-lux-text-secondary/60 text-[10px] font-semibold mt-0.5">{t('every6Hours')}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-lux-text-secondary/40 text-[18px]">chevron_right</span>
            </div>
            {/* Request Speed */}
            <div className="flex flex-col gap-2 px-4 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-4 justify-between mb-1">
                <div className="flex items-center gap-4">
                  <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                    <span className="material-symbols-outlined text-[20px]">speed</span>
                  </div>
                  <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('requestSpeed')}</p>
                </div>
                <span className="text-[#E1306C] text-xs font-extrabold">{t('balanced')}</span>
              </div>
              <input className="w-full h-[3px] bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#E1306C] border border-white/[0.04]" max="3" min="1" type="range" defaultValue="2" />
              <div className="flex justify-between text-[9px] text-lux-text-secondary/60 font-bold px-1 mt-1">
                <span>{t('safe')}</span>
                <span>{t('balanced')}</span>
                <span>{t('fast')}</span>
              </div>
            </div>
            {/* Concurrent Requests */}
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                  <span className="material-symbols-outlined text-[20px]">layers</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('concurrentRequests')}</p>
                  <p className="text-lux-text-secondary/60 text-[10px] font-semibold mt-0.5">{t('simultaneousScans')}</p>
                </div>
              </div>
              <div className="flex items-center bg-white/5 border border-white/[0.08] rounded-full p-0.5">
                <button className="size-7 flex items-center justify-center rounded-full text-lux-text-primary hover:bg-white/10 transition-all font-extrabold">-</button>
                <span className="px-3 font-extrabold text-xs text-lux-text-primary">3</span>
                <button className="size-7 flex items-center justify-center rounded-full text-lux-text-primary hover:bg-white/10 transition-all font-extrabold">+</button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Notifications */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-lux-text-secondary/50 px-4 pb-2">{t('notifications')}</h3>
          <div className="glass-card rounded-2xl overflow-hidden border border-white/[0.04]">
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between border-b border-white/[0.04]">
              <div className="flex items-center gap-4">
                <div className="text-[#E1306C] flex items-center justify-center rounded-lg bg-[#E1306C]/10 border border-[#E1306C]/20 shrink-0 size-9">
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                </div>
                <p className="text-lux-text-primary text-xs font-bold leading-normal">{t('pushNotifications')}</p>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between border-b border-white/[0.04]">
              <div className="flex items-center gap-4 pl-13">
                <p className="text-lux-text-primary text-xs font-semibold leading-normal">{t('newFollowerAlerts')}</p>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className="flex items-center gap-4 px-4 min-h-[64px] py-2 justify-between">
              <div className="flex items-center gap-4 pl-13">
                <p className="text-lux-text-primary text-xs font-semibold leading-normal">{t('lostFollowerAlerts')}</p>
              </div>
              <Toggle defaultChecked />
            </div>
          </div>
        </section>
        
        {/* Version Info */}
        <div className="text-center pt-4 pb-10">
            <p className="text-lux-text-secondary/40 text-[10px] font-bold">FollowerTrack v1.0.0</p>
            <p className="text-lux-text-secondary/20 text-[9px] mt-1 font-bold">{t('madeWithLove')}</p>
        </div>
      </div>
    </div>
  );
};

export default DetailedSettings;