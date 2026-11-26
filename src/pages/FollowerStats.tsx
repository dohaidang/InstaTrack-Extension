import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { Icon } from '../components/Icon';
import { EmptyState, PageHeader, StatusBadge } from '../components/LedgerUI';
import { useFollowerData } from '../hooks/useFollowerData';
import { useLanguage } from '../hooks/useLanguage';
import type { Follower, StatusType } from '../types';
import { exportToCsv } from '../utils/exportCsv';
import { openInBackgroundTab } from '../utils/openInBackgroundTab';

type TabType = StatusType;
const PAGE_SIZE = 80;

const tabFromParam = (value: string | null): TabType => {
  if (value === 'lost') return 'Lost';
  if (value === 'new') return 'New';
  if (value === 'notfollowing') return 'Not Following Back';
  if (value === 'newfollowing') return 'New Following';
  return 'Mutual';
};

const paramFromTab = (tab: TabType) => ({
  Mutual: 'mutual',
  Lost: 'lost',
  New: 'new',
  'Not Following Back': 'notfollowing',
  'New Following': 'newfollowing',
}[tab]);

const FollowerStats = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { stats, loading } = useFollowerData();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(() => tabFromParam(params.get('tab')));
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setActiveTab(tabFromParam(params.get('tab')));
    setVisibleCount(PAGE_SIZE);
  }, [params]);

  const categories: TabType[] = ['Mutual', 'Lost', 'New', 'New Following', 'Not Following Back'];
  const listMap: Record<TabType, Follower[]> = {
    Mutual: stats.mutualList,
    Lost: stats.lostFollowersList,
    New: stats.newFollowersList,
    'Not Following Back': stats.notFollowingBackList,
    'New Following': stats.newFollowingList,
  };
  const countMap: Record<TabType, number> = {
    Mutual: stats.mutualCount,
    Lost: stats.lostFollowersCount,
    New: stats.newFollowersCount,
    'Not Following Back': stats.notFollowingBackCount,
    'New Following': stats.newFollowingCount,
  };
  const labelMap: Record<TabType, string> = {
    Mutual: t('mutual'),
    Lost: t('lost'),
    New: t('new'),
    'Not Following Back': t('notFollowing'),
    'New Following': t('newFollowing'),
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return listMap[activeTab];
    return listMap[activeTab].filter((person) =>
      person.username.toLowerCase().includes(needle)
      || person.fullName?.toLowerCase().includes(needle));
  }, [activeTab, query, stats]);

  const visible = filtered.slice(0, visibleCount);
  const changeTab = (tab: TabType) => {
    setActiveTab(tab);
    setQuery('');
    setVisibleCount(PAGE_SIZE);
    navigate({ pathname: '/stats', search: `?tab=${paramFromTab(tab)}` }, { replace: true });
  };

  return (
    <div className="ledger-page">
      <PageHeader
        eyebrow="Account index"
        title={t('followerStats')}
        action={(
          <button
            className="icon-button"
            disabled={filtered.length === 0}
            onClick={() => exportToCsv(
              filtered,
              `instagram_${paramFromTab(activeTab)}_${new Date().toISOString().slice(0, 10)}`,
              activeTab,
            )}
            aria-label={t('exportCsv')}
          >
            <Icon name="download" />
          </button>
        )}
      />

      <div className="category-strip" role="tablist" aria-label="Account category">
        {categories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={activeTab === category}
            className={activeTab === category ? 'is-active' : ''}
            onClick={() => changeTab(category)}
          >
            <span>{labelMap[category]}</span>
            <strong>{countMap[category].toLocaleString()}</strong>
          </button>
        ))}
      </div>

      <div className="list-toolbar">
        <label className="search-field">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={t('searchPlaceholder')}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="close" size={15} />
            </button>
          )}
        </label>
        <span>{filtered.length.toLocaleString()} {language === 'vi' ? 'tài khoản' : 'accounts'}</span>
      </div>

      {loading ? (
        <div className="record-loading"><span />{language === 'vi' ? 'Đang đọc bản ghi…' : 'Reading ledger…'}</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={query ? 'search' : 'accounts'}
          title={query ? t('noResults') : t('noDataYet')}
          body={language === 'vi'
            ? 'Danh sách này sẽ xuất hiện sau một lần quét hoàn chỉnh.'
            : 'This index appears after a complete verified scan.'}
        />
      ) : (
        <>
          <div className="account-list">
            {visible.map((person, index) => (
              <AccountRow
                key={person.id || person.username}
                person={person}
                index={index + 1}
                status={activeTab}
                statusLabel={labelMap[activeTab]}
              />
            ))}
          </div>
          {visible.length < filtered.length && (
            <button className="secondary-action" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              {language === 'vi' ? 'Tải thêm' : 'Load next'} {Math.min(PAGE_SIZE, filtered.length - visible.length)}
            </button>
          )}
        </>
      )}
    </div>
  );
};

const AccountRow = ({
  person,
  index,
  status,
  statusLabel,
}: {
  person: Follower;
  index: number;
  status: TabType;
  statusLabel: string;
}) => (
  <a
    className="account-row"
    href={`https://www.instagram.com/${encodeURIComponent(person.username)}/`}
    target="_blank"
    rel="noreferrer"
    onClick={openInBackgroundTab}
  >
    <span className="account-row__index">{String(index).padStart(2, '0')}</span>
    <Avatar src={person.avatarUrl} username={person.username} size="sm" />
    <span className="account-row__identity">
      <strong>@{person.username}</strong>
      <small>{person.fullName || 'Instagram account'}</small>
    </span>
    <StatusBadge tone={status === 'Lost' ? 'error' : status === 'New' || status === 'New Following' ? 'verified' : 'quiet'}>
      {statusLabel}
    </StatusBadge>
    <Icon name="external" size={15} />
  </a>
);

export default FollowerStats;
