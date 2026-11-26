import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { Icon } from '../components/Icon';
import { StatusBadge, formatMoment } from '../components/LedgerUI';
import { useFollowerData } from '../hooks/useFollowerData';
import { useLanguage } from '../hooks/useLanguage';
import { useTrackerState } from '../hooks/useTrackerState';
import type { QueueItemStatus, ScanProgress } from '../types';
import {
  queueIsLive,
  startQueueScan,
  startSingleScan,
  stopQueueScan,
  usernamesByStaleness,
} from '../utils/scanLauncher';
import { openInBackgroundTab } from '../utils/openInBackgroundTab';
import { removeAccount, setActiveAccount } from '../utils/trackerStorage';
import { addUsernameToHistory, clearUsernameHistory, getUsernameHistory } from '../utils/usernameHistory';

const activePhases: ScanProgress['phase'][] = ['resolving', 'followers', 'following', 'processing'];

const queueTone: Record<QueueItemStatus, 'verified' | 'warning' | 'error' | 'quiet'> = {
  pending: 'quiet',
  running: 'warning',
  done: 'verified',
  error: 'error',
  skipped: 'quiet',
};

const Dashboard = () => {
  const { stats } = useFollowerData();
  const { state, queue, reload } = useTrackerState();
  const { language, t } = useLanguage();
  const [targetUsername, setTargetUsername] = useState('');
  const [usernameHistory, setUsernameHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [formError, setFormError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const isScanning = Boolean(progress && activePhases.includes(progress.phase));
  const liveQueue = queueIsLive(queue, progress?.timestamp) ? queue : null;
  // A queue is "busy" even between accounts, while the progress phase is momentarily done/error
  const isBusy = isScanning || Boolean(liveQueue);
  const hasData = Boolean(stats.lastUpdated);
  const trackedAccounts = Object.entries(state?.accounts ?? {});
  const queueItems = queue && Date.now() - queue.updatedAt < 60 * 60 * 1000 ? queue.items : [];
  const queueStatusFor = (username: string) =>
    queueItems.find((item) => item.username.toLowerCase() === username.toLowerCase());

  useEffect(() => {
    void getUsernameHistory().then(setUsernameHistory);
    void chrome.storage.local.get(['scanProgress', 'targetUsername']).then((result) => {
      if (result.targetUsername) setTargetUsername(result.targetUsername as string);
      const saved = result.scanProgress as ScanProgress | undefined;
      if (saved && Date.now() - saved.timestamp < 60 * 60 * 1000) setProgress(saved);
    });

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.scanProgress) {
        setProgress(changes.scanProgress.newValue as ScanProgress);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const node = event.target as Node;
      if (!inputRef.current?.contains(node) && !historyRef.current?.contains(node)) setShowHistory(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const normalizedUsername = targetUsername.trim().replace(/^@/, '');
  const usernameIsValid = /^[A-Za-z0-9._]{1,30}$/.test(normalizedUsername);

  const startScan = async () => {
    if (!usernameIsValid) {
      setFormError(language === 'vi'
        ? 'Username chỉ được chứa chữ, số, dấu chấm và gạch dưới.'
        : 'Use letters, numbers, dots, and underscores only.');
      inputRef.current?.focus();
      return;
    }

    setFormError('');
    setShowHistory(false);
    const nextHistory = await addUsernameToHistory(normalizedUsername);
    setUsernameHistory(nextHistory);

    setProgress(await startSingleScan(normalizedUsername));
  };

  const rescan = async (username: string) => {
    setTargetUsername(username);
    setFormError('');
    setProgress(await startSingleScan(username));
  };

  const scanAll = async () => {
    if (!state) return;
    const started = await startQueueScan(usernamesByStaleness(state));
    if (started) setProgress(started);
  };

  const stopQueue = async () => {
    if (!queue) return;
    await stopQueueScan(queue, isScanning ? progress?.scanId : undefined);
  };

  const stopTracking = async (accountId: string, username: string) => {
    const message = language === 'vi'
      ? `Ngừng theo dõi @${username} và xóa các bản quét của tài khoản này?`
      : `Stop tracking @${username} and delete its saved scans?`;
    if (!window.confirm(message)) return;
    await removeAccount(accountId);
    await reload();
  };

  const selectAccount = async (accountId: string) => {
    await setActiveAccount(accountId);
    await reload();
  };

  const phaseIndex = progress ? activePhases.indexOf(progress.phase) : -1;
  const percent = progress?.total
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : isScanning ? Math.max(8, (phaseIndex + 1) * 20) : progress?.phase === 'done' ? 100 : 0;

  const activity = [
    ...stats.newFollowersList.slice(0, 2).map((person) => ({ ...person, kind: 'new' as const })),
    ...stats.lostFollowersList.slice(0, 2).map((person) => ({ ...person, kind: 'lost' as const })),
  ];

  return (
    <div className="ledger-page ledger-page--dashboard">
      <header className="masthead">
        <div>
          <span className="eyebrow">Social ledger / v2</span>
          <h1>Follower<br /><em>record.</em></h1>
        </div>
        <StatusBadge tone={hasData ? 'verified' : 'quiet'}>
          {hasData ? (language === 'vi' ? 'Đã xác minh' : 'Verified') : (language === 'vi' ? 'Chưa có dữ liệu' : 'No record')}
        </StatusBadge>
      </header>

      <section className="account-strip">
        <Avatar
          src={stats.avatarBase64 || stats.avatarUrl || ''}
          username={stats.username || normalizedUsername || '?'}
          size="md"
        />
        <div className="account-strip__copy">
          <span className="eyebrow">{language === 'vi' ? 'Tài khoản đang theo dõi' : 'Active record'}</span>
          <strong>@{stats.username || normalizedUsername || 'not-connected'}</strong>
          <span>{hasData ? formatMoment(stats.lastUpdated, language) : (language === 'vi' ? 'Chưa từng quét' : 'Never scanned')}</span>
        </div>
        {hasData && <Icon name="check" className="verified-mark" size={22} />}
      </section>

      <section className="scan-console" aria-labelledby="scan-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / Capture</span>
            <h2 id="scan-title">{language === 'vi' ? 'Tạo bản ghi mới' : 'Create a new record'}</h2>
          </div>
          <span className="section-index">IG</span>
        </div>

        <div className="username-field">
          <span aria-hidden="true">@</span>
          <input
            ref={inputRef}
            value={targetUsername}
            onChange={(event) => {
              setTargetUsername(event.target.value);
              setFormError('');
            }}
            onFocus={() => setShowHistory(usernameHistory.length > 0)}
            disabled={isBusy}
            placeholder="username"
            aria-invalid={Boolean(formError)}
            aria-describedby={formError ? 'username-error' : undefined}
          />
          {targetUsername && !isBusy && (
            <button className="field-clear" onClick={() => setTargetUsername('')} aria-label="Clear username">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        {formError && <p id="username-error" className="field-error">{formError}</p>}

        {showHistory && usernameHistory.length > 0 && (
          <div className="history-popover" ref={historyRef}>
            <div className="history-popover__head">
              <span>{t('recent')}</span>
              <button onClick={async () => {
                await clearUsernameHistory();
                setUsernameHistory([]);
                setShowHistory(false);
              }}>{t('clear')}</button>
            </div>
            {usernameHistory.map((username) => (
              <button key={username} onClick={() => {
                setTargetUsername(username);
                setShowHistory(false);
              }}>@{username}</button>
            ))}
          </div>
        )}

        <button className="primary-action" onClick={startScan} disabled={isBusy}>
          <Icon name="scan" />
          <span>{isBusy ? (language === 'vi' ? 'Đang xác minh…' : 'Verifying…') : (language === 'vi' ? 'Bắt đầu quét' : 'Start verified scan')}</span>
          <Icon name="arrow" />
        </button>
      </section>

      {trackedAccounts.length > 0 && (
        <section className="tracked-section" aria-labelledby="tracked-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{language === 'vi' ? 'Nhiều tài khoản' : 'Multi-account'}</span>
              <h2 id="tracked-title">
                {language === 'vi' ? 'Tài khoản đang theo dõi' : 'Tracked accounts'}
                {' '}<span className="count-chip">{trackedAccounts.length}</span>
              </h2>
            </div>
          </div>

          <div className="tracked-list">
            {trackedAccounts.map(([id, account]) => {
              const isActive = state?.activeAccountId === id;
              const item = queueStatusFor(account.profile.username);
              const { counts, completedAt } = account.latestScan;
              return (
                <div key={id} className={`tracked-row ${isActive ? 'is-active' : ''}`}>
                  <button
                    className="tracked-row__main"
                    onClick={() => void selectAccount(id)}
                    aria-pressed={isActive}
                    title={language === 'vi' ? 'Xem số liệu của tài khoản này' : 'Show this account’s numbers'}
                  >
                    <Avatar
                      src={account.profile.avatarBase64 || account.profile.avatarUrl}
                      username={account.profile.username}
                      size="sm"
                    />
                    <span className="tracked-row__copy">
                      <strong>@{account.profile.username}</strong>
                      <small>
                        {counts.followers.toLocaleString()} {language === 'vi' ? 'người theo dõi' : 'followers'}
                        {' · '}<b className="delta delta--up">+{counts.new}</b>
                        {' '}<b className="delta delta--down">−{counts.lost}</b>
                        {' · '}{formatMoment(completedAt, language)}
                      </small>
                    </span>
                  </button>
                  {item && (
                    <StatusBadge tone={queueTone[item.status]}>
                      {language === 'vi'
                        ? { pending: 'Chờ', running: 'Đang quét', done: 'Xong', error: 'Lỗi', skipped: 'Bỏ qua' }[item.status]
                        : { pending: 'Queued', running: 'Scanning', done: 'Done', error: 'Failed', skipped: 'Skipped' }[item.status]}
                    </StatusBadge>
                  )}
                  <div className="tracked-row__actions">
                    <button
                      className="icon-button"
                      onClick={() => void rescan(account.profile.username)}
                      disabled={isBusy}
                      aria-label={`${language === 'vi' ? 'Quét lại' : 'Rescan'} @${account.profile.username}`}
                    ><Icon name="scan" size={15} /></button>
                    <button
                      className="icon-button"
                      onClick={() => void stopTracking(id, account.profile.username)}
                      disabled={isBusy}
                      aria-label={`${language === 'vi' ? 'Ngừng theo dõi' : 'Stop tracking'} @${account.profile.username}`}
                    ><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {liveQueue ? (
            <button className="secondary-action" onClick={() => void stopQueue()}>
              <Icon name="close" size={16} />
              {language === 'vi' ? 'Dừng hàng đợi' : 'Stop queue'}
            </button>
          ) : (
            <button
              className="secondary-action"
              onClick={() => void scanAll()}
              disabled={isBusy || trackedAccounts.length < 2}
            >
              <Icon name="scan" size={16} />
              {language === 'vi' ? `Quét lần lượt ${trackedAccounts.length} tài khoản` : `Scan all ${trackedAccounts.length} accounts in turn`}
            </button>
          )}
          <p className="integrity-note">
            {liveQueue?.waitingUntil
              ? (language === 'vi'
                ? 'Đang nghỉ giữa hai tài khoản để tránh bị Instagram giới hạn. Giữ tab Instagram mở.'
                : 'Pausing between accounts so Instagram does not throttle you. Keep the Instagram tab open.')
              : queue?.stopReason && queue.updatedAt > Date.now() - 60 * 60 * 1000
                ? `${language === 'vi' ? 'Hàng đợi đã dừng: ' : 'Queue stopped: '}${queue.stopReason}`
                : (language === 'vi'
                  ? 'Quét lần lượt từng tài khoản, nghỉ 30–45 giây giữa các tài khoản. Cần đăng nhập Instagram và giữ tab mở.'
                  : 'Accounts are scanned one at a time with a 30–45s pause between them. Stay logged in to Instagram and keep the tab open.')}
          </p>
        </section>
      )}

      {(isScanning || progress?.phase === 'error' || progress?.phase === 'done') && (
        <section className={`integrity-panel ${progress?.phase === 'error' ? 'is-error' : ''}`}>
          <div className="integrity-panel__head">
            <div>
              <span className="eyebrow">Scan integrity</span>
              <strong>{progress?.message}</strong>
            </div>
            <span className="progress-figure">{percent}%</span>
          </div>
          <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
          <ol className="integrity-rail">
            {[
              ['resolving', language === 'vi' ? 'Tài khoản' : 'Account'],
              ['followers', 'Followers'],
              ['following', 'Following'],
              ['processing', language === 'vi' ? 'Lưu bản ghi' : 'Commit'],
            ].map(([phase, label], index) => {
              const completed = progress?.phase === 'done' || phaseIndex > index;
              const current = progress?.phase === phase;
              return (
                <li key={phase} className={completed ? 'is-complete' : current ? 'is-current' : ''}>
                  <span>{completed ? <Icon name="check" size={12} /> : index + 1}</span>
                  <small>{label}</small>
                </li>
              );
            })}
          </ol>
          {progress?.phase === 'error' && (
            <p className="integrity-note">{language === 'vi'
              ? 'Bản ghi đã xác minh trước đó vẫn được giữ nguyên.'
              : 'Your previous verified record remains unchanged.'}</p>
          )}
          {isScanning && progress?.scanId && !liveQueue && (
            <button
              className="scan-cancel"
              onClick={() => chrome.storage.local.set({ cancelScanId: progress.scanId })}
            >{language === 'vi' ? 'Dừng lần quét này' : 'Cancel this scan'}</button>
          )}
        </section>
      )}

      <section className="metric-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">02 / Snapshot</span>
            <h2>{language === 'vi' ? 'Số liệu đã xác minh' : 'Verified totals'}</h2>
          </div>
        </div>
        <div className="metric-grid">
          <Link to="/stats?tab=mutual" className="metric-cell metric-cell--wide">
            <span>{t('followers')}</span>
            <strong>{hasData ? stats.totalFollowers.toLocaleString() : '—'}</strong>
            <small>{stats.mutualCount.toLocaleString()} {language === 'vi' ? 'kết nối hai chiều' : 'mutual connections'}</small>
          </Link>
          <div className="metric-cell">
            <span>{t('following')}</span>
            <strong>{hasData ? stats.totalFollowing.toLocaleString() : '—'}</strong>
          </div>
          <Link to="/stats?tab=new" className="metric-cell metric-cell--positive">
            <span>{t('new')}</span>
            <strong>{hasData ? `+${stats.newFollowersCount}` : '—'}</strong>
          </Link>
          <Link to="/stats?tab=lost" className="metric-cell metric-cell--negative">
            <span>{t('lost')}</span>
            <strong>{hasData ? stats.lostFollowersCount : '—'}</strong>
          </Link>
          <Link to="/stats?tab=notfollowing" className="metric-cell">
            <span>{t('notFollowing')}</span>
            <strong>{hasData ? stats.notFollowingBackCount : '—'}</strong>
          </Link>
          <Link to="/stats?tab=newfollowing" className="metric-cell metric-cell--full metric-cell--positive">
            <span>{t('newFollowing')}</span>
            <strong>{hasData ? `+${stats.newFollowingCount}` : '—'}</strong>
            <small>{language === 'vi' ? 'Tài khoản bạn vừa follow kể từ lần quét trước' : 'Accounts you followed since the previous scan'}</small>
          </Link>
        </div>
      </section>

      <section className="activity-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / Delta</span>
            <h2>{language === 'vi' ? 'Thay đổi gần nhất' : 'Latest changes'}</h2>
          </div>
          <Link to="/stats" className="text-link">{language === 'vi' ? 'Xem tất cả' : 'View all'} <Icon name="arrow" size={14} /></Link>
        </div>
        {activity.length === 0 ? (
          <p className="quiet-copy">{hasData
            ? (language === 'vi' ? 'Không có thay đổi so với lần quét trước.' : 'No changes against the previous record.')
            : (language === 'vi' ? 'Bắt đầu một lần quét để tạo đường cơ sở.' : 'Run a scan to establish your baseline.')}</p>
        ) : (
          <div className="activity-list">
            {activity.map((person) => (
              <a
                key={`${person.kind}-${person.id}`}
                href={`https://www.instagram.com/${encodeURIComponent(person.username)}/`}
                target="_blank"
                rel="noreferrer"
                onClick={openInBackgroundTab}
              >
                <Avatar src={person.avatarUrl} username={person.username} size="sm" />
                <span><strong>@{person.username}</strong><small>{person.fullName || 'Instagram account'}</small></span>
                <StatusBadge tone={person.kind === 'new' ? 'verified' : 'error'}>
                  {person.kind === 'new' ? `+${t('new')}` : `−${t('lost')}`}
                </StatusBadge>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
