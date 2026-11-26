import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export const PageHeader = ({
  eyebrow,
  title,
  action,
  back = true,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  back?: boolean;
}) => {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <div className="page-header__side">
        {back && (
          <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <Icon name="chevron" className="rotate-180" />
          </button>
        )}
      </div>
      <div className="page-header__copy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="page-header__side page-header__side--end">{action}</div>
    </header>
  );
};

export const StatusBadge = ({ tone, children }: React.PropsWithChildren<{ tone: 'verified' | 'warning' | 'error' | 'quiet' }>) => (
  <span className={`status-badge status-badge--${tone}`}>{children}</span>
);

export const EmptyState = ({ icon, title, body }: { icon: IconName; title: string; body: string }) => (
  <div className="empty-state">
    <Icon name={icon} size={24} />
    <strong>{title}</strong>
    <p>{body}</p>
  </div>
);

export const formatMoment = (value: string | null, language = 'en') => {
  if (!value) return '—';
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};
