import { useEffect, useState } from 'react';

interface AvatarProps {
  src?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
}

const colors = ['#B83E38', '#247553', '#A86616', '#365E7D', '#75465D', '#6D634D'];

const colorFor = (name: string) => {
  const total = [...name].reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  return colors[total % colors.length];
};

const initialsFor = (name: string) => {
  const cleaned = name.replace(/[_.-]/g, '');
  return cleaned.slice(0, 2).toUpperCase() || '?';
};

const Avatar = ({
  src,
  username = 'user',
  size = 'md',
  hasStory = false,
  className = '',
}: AvatarProps) => {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  return (
    <span
      className={`avatar avatar--${size} ${hasStory ? 'avatar--marked' : ''} ${className}`}
      style={{ '--avatar-color': colorFor(username) } as React.CSSProperties}
      aria-label={`@${username}`}
    >
      <span className="avatar__fallback">{initialsFor(username)}</span>
      {src && !failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};

export default Avatar;
