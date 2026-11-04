import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import { Icon } from '../components/Icon';
import { PageHeader, StatusBadge, formatMoment } from '../components/LedgerUI';
import { useLanguage } from '../hooks/useLanguage';
import type { TrackerStateV2 } from '../types';
import {
  clearTrackingData,
  getTrackerState,
  setActiveAccount,
  TRACKER_STATE_KEY,
} from '../utils/trackerStorage';

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <label className="switch" aria-label={label}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span />
  </label>
);

const Settings = () => {
  const { language, changeLanguage, t } = useLanguage();
  const [darkMode, setDarkMode] = useState(true);
  const [state, setState] = useState<TrackerStateV2 | null>(null);
  const [storageBytes, setStorageBytes] = useState(0);

  const load = async () => {
    const [settings, trackerState, bytes] = await Promise.all([
      chrome.storage.local.get(['darkMode']),
      getTrackerState(),
      chrome.storage.local.getBytesInUse(null),
    ]);
    const dark = settings.darkMode !== false;
    setDarkMode(dark);
    document.documentElement.classList.toggle('dark', dark);
    setState(trackerState);
    setStorageBytes(bytes);
  };

  useEffect(() => {
    void load();
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[TRACKER_STATE_KEY]) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const toggleTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    document.documentElement.classList.toggle('dark', enabled);
    void chrome.storage.local.set({ darkMode: enabled });
  };

  const exportData = async () => {
    const trackerState = await getTrackerState();
    const blob = new Blob([JSON.stringify(trackerState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `instagram-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearData = async () => {
    const message = language === 'vi'
      ? 'Xóa toàn bộ bản ghi đã quét? Hành động này không thể hoàn tác.'
      : 'Delete every saved scan? This cannot be undone.';
    if (!window.confirm(message)) return;
    await clearTrackingData();
    await load();
  };

  const accounts = Object.entries(state?.accounts || {});
  const active = state?.activeAccountId ? state.accounts[state.activeAccountId] : null;

  return (
    <div className="ledger-page">
      <PageHeader eyebrow="Local controls" title={t('settings')} />

      {active && (
        <section className="settings-account">
          <Avatar
            src={active.profile.avatarBase64 || active.profile.avatarUrl}
            username={active.profile.username}
            size="lg"
          />
          <div>
            <span className="eyebrow">{language === 'vi' ? 'Bản ghi đang mở' : 'Active ledger'}</span>
            <h2>@{active.profile.username}</h2>
            <p>{formatMoment(active.latestScan.completedAt, language)}</p>
          </div>
          <StatusBadge tone="verified">{language === 'vi' ? 'Cục bộ' : 'Local'}</StatusBadge>
        </section>
      )}

      {accounts.length > 1 && (
        <section className="settings-section">
          <div className="section-heading">
            <div><span className="eyebrow">Accounts</span><h2>{language === 'vi' ? 'Chuyển bản ghi' : 'Switch ledger'}</h2></div>
          </div>
          <div className="account-switcher">
            {accounts.map(([id, account]) => (
              <button
                key={id}
                className={state?.activeAccountId === id ? 'is-active' : ''}
                onClick={async () => {
                  await setActiveAccount(id);
                  await load();
                }}
              >
                <Avatar username={account.profile.username} size="sm" />
                <span>@{account.profile.username}</span>
                {state?.activeAccountId === id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="settings-section">
        <div className="section-heading">
          <div><span className="eyebrow">Interface</span><h2>{t('general')}</h2></div>
        </div>
        <div className="settings-list">
          <div className="setting-row">
            <span className="setting-row__icon"><Icon name="language" /></span>
            <div><strong>{t('language')}</strong><small>{language === 'en' ? 'English' : 'Tiếng Việt'}</small></div>
            <button className="compact-action" onClick={() => changeLanguage(language === 'en' ? 'vi' : 'en')}>
              {language === 'en' ? 'VI' : 'EN'}
            </button>
          </div>
          <div className="setting-row">
            <span className="setting-row__icon"><Icon name="moon" /></span>
            <div><strong>{t('darkMode')}</strong><small>{language === 'vi' ? 'Giao diện than ấm' : 'Warm charcoal palette'}</small></div>
            <Toggle checked={darkMode} onChange={toggleTheme} label={t('darkMode')} />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="section-heading">
          <div><span className="eyebrow">Data custody</span><h2>{language === 'vi' ? 'Dữ liệu trên thiết bị' : 'On-device data'}</h2></div>
        </div>
        <div className="data-receipt">
          <div><span>{language === 'vi' ? 'Tài khoản' : 'Accounts'}</span><strong>{accounts.length}</strong></div>
          <div><span>{language === 'vi' ? 'Đang sử dụng' : 'Storage used'}</span><strong>{(storageBytes / 1024).toFixed(1)} KB</strong></div>
          <div><span>{language === 'vi' ? 'Chính sách' : 'Custody'}</span><strong>{language === 'vi' ? 'Chỉ cục bộ' : 'Local only'}</strong></div>
        </div>
        <div className="settings-actions">
          <button className="secondary-action" onClick={exportData} disabled={!accounts.length}>
            <Icon name="download" /> {language === 'vi' ? 'Xuất bản sao' : 'Export backup'}
          </button>
          <button className="danger-action" onClick={clearData} disabled={!accounts.length}>
            <Icon name="trash" /> {language === 'vi' ? 'Xóa dữ liệu quét' : 'Clear scan data'}
          </button>
        </div>
      </section>

      <footer className="version-receipt">
        <span>INSTAGRAM TRACKER</span>
        <strong>v1.0.0 / schema 2</strong>
        <small>{language === 'vi' ? 'Không có dữ liệu được gửi tới máy chủ riêng.' : 'No private backend. Records remain in your browser.'}</small>
      </footer>
    </div>
  );
};

export default Settings;
