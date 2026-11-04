import { useEffect, useMemo, useState } from 'react';
import Avatar from '../components/Avatar';
import { Icon } from '../components/Icon';
import { EmptyState, PageHeader, StatusBadge, formatMoment } from '../components/LedgerUI';
import { useLanguage } from '../hooks/useLanguage';
import type { TrackerStateV2 } from '../types';
import { getTrackerState, TRACKER_STATE_KEY } from '../utils/trackerStorage';

const ScanHistory = () => {
  const { language, t } = useLanguage();
  const [state, setState] = useState<TrackerStateV2 | null>(null);
  const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
  const [expandedEntryKey, setExpandedEntryKey] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const next = await getTrackerState();
      setState(next);
      setFilterAccountId((current) => current || next.activeAccountId);
    };
    void load();

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[TRACKER_STATE_KEY]) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const accounts = Object.entries(state?.accounts || {});
  const filteredAccounts = filterAccountId
    ? accounts.filter(([accountId]) => accountId === filterAccountId)
    : accounts;

  const entries = useMemo(() => filteredAccounts
    .flatMap(([accountId, account]) => account.history.map((scan) => {
      const lostIds = Array.isArray(scan.lostIds)
        ? scan.lostIds
        : scan.id === account.latestScan.id
          ? account.latestScan.diffs.lost
          : null;
      return {
        ...scan,
        entryKey: `${accountId}:${scan.id}`,
        accountId,
        profile: account.profile,
        lostDetailsAvailable: lostIds !== null,
        lostPeople: (lostIds || [])
          .map((id) => account.people[id])
          .filter((person) => Boolean(person)),
      };
    }))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
  [state, filterAccountId]);

  return (
    <div className="ledger-page">
      <PageHeader eyebrow="Audit trail" title={t('scanHistory')} />

      {accounts.length > 1 && (
        <div className="account-filter" aria-label="Filter history by account">
          <button
            className={!filterAccountId ? 'is-active' : ''}
            onClick={() => setFilterAccountId(null)}
          >{language === 'vi' ? 'Tất cả' : 'All'}</button>
          {accounts.map(([id, account]) => (
            <button
              key={id}
              className={filterAccountId === id ? 'is-active' : ''}
              onClick={() => setFilterAccountId(id)}
            >@{account.profile.username}</button>
          ))}
        </div>
      )}

      {!state ? (
        <div className="record-loading"><span />{language === 'vi' ? 'Đang đọc lịch sử…' : 'Reading audit trail…'}</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="history"
          title={t('noHistory')}
          body={language === 'vi'
            ? 'Mỗi lần quét hoàn chỉnh sẽ tạo một mốc thời gian tại đây.'
            : 'Every completed scan creates a timestamped entry here.'}
        />
      ) : (
        <div className="timeline">
          {entries.map((entry, index) => (
            <article className="timeline-entry" key={entry.entryKey}>
              <div className="timeline-entry__rail">
                <span>{index === 0 ? <Icon name="check" size={12} /> : index + 1}</span>
              </div>
              <div className="timeline-entry__body">
                <div className="timeline-entry__head">
                  <div className="timeline-entry__account">
                    <Avatar
                      src={entry.profile.avatarBase64 || entry.profile.avatarUrl}
                      username={entry.profile.username}
                      size="sm"
                    />
                    <div>
                      <strong>@{entry.profile.username}</strong>
                      <small>{formatMoment(entry.completedAt, language)}</small>
                    </div>
                  </div>
                  <StatusBadge tone="verified">{language === 'vi' ? 'Hoàn chỉnh' : 'Complete'}</StatusBadge>
                </div>
                <dl className="history-metrics">
                  <div><dt>{t('followers')}</dt><dd>{entry.counts.followers.toLocaleString()}</dd></div>
                  <div><dt>{t('following')}</dt><dd>{entry.counts.following.toLocaleString()}</dd></div>
                  <div className="is-positive"><dt>{t('new')}</dt><dd>+{entry.counts.new}</dd></div>
                  <div className="is-negative"><dt>{t('lost')}</dt><dd>−{entry.counts.lost}</dd></div>
                </dl>
                {entry.counts.lost > 0 && (
                  <>
                    <button
                      className="history-lost-toggle"
                      aria-expanded={expandedEntryKey === entry.entryKey}
                      onClick={() => setExpandedEntryKey((current) =>
                        current === entry.entryKey ? null : entry.entryKey)}
                    >
                      <span>{language === 'vi' ? 'Tài khoản đã mất' : 'Lost accounts'}</span>
                      <span>
                        {expandedEntryKey === entry.entryKey
                          ? (language === 'vi' ? 'Thu gọn' : 'Hide')
                          : (language === 'vi' ? 'Xem danh sách' : 'View list')}
                        <Icon name="arrow" size={13} />
                      </span>
                    </button>
                    {expandedEntryKey === entry.entryKey && (
                      <div className="history-lost-list">
                        {!entry.lostDetailsAvailable ? (
                          <p>{language === 'vi'
                            ? 'Mốc này được tạo trước khi ứng dụng lưu chi tiết tài khoản lost.'
                            : 'This record predates stored lost-account details.'}</p>
                        ) : entry.lostPeople.length === 0 ? (
                          <p>{language === 'vi'
                            ? 'Không còn thông tin tài khoản cho mốc này.'
                            : 'No account details remain for this record.'}</p>
                        ) : (
                          <>
                            {entry.lostPeople.map((person) => (
                              <a
                                key={person.id}
                                href={`https://www.instagram.com/${encodeURIComponent(person.username)}/`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Avatar src={person.avatarUrl} username={person.username} size="sm" />
                                <span>
                                  <strong>@{person.username}</strong>
                                  <small>{person.fullName || 'Instagram account'}</small>
                                </span>
                                <Icon name="arrow" size={14} />
                              </a>
                            ))}
                            {entry.lostPeople.length < entry.counts.lost && (
                              <p>{language === 'vi'
                                ? `Hiển thị ${entry.lostPeople.length}/${entry.counts.lost} tài khoản còn thông tin.`
                                : `Showing ${entry.lostPeople.length}/${entry.counts.lost} accounts with stored details.`}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanHistory;
