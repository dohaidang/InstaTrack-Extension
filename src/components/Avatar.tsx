import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
}

// Color palette for initials background
const COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
  '#2196F3', '#00BCD4', '#009688', '#4CAF50', 
  '#FF9800', '#FF5722', '#795548', '#607D8B'
];

// Get consistent color based on username
const getColorForName = (name: string): string => {
  const index = name.charCodeAt(0) % COLORS.length;
  return COLORS[index];
};

// Get initials from username (max 2 chars)
const getInitials = (name: string): string => {
  if (!name) return '?';
  // Remove underscores and get first 2 chars
  const cleaned = name.replace(/[_.-]/g, '');
  return cleaned.substring(0, 2).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  username = 'user', 
  size = 'md', 
  hasStory = false, 
  className = '' 
}) => {
  const [showFallback, setShowFallback] = useState(!src);

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-2xl',
  };

  const containerSize = sizeClasses[size];
  const bgColor = getColorForName(username);
  const initials = getInitials(username);

  const handleImageError = () => {
    setShowFallback(true);
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${hasStory ? 'p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2b8c] to-[#6228d7]' : ''} rounded-full`}>
        <div className={`bg-white dark:bg-background-dark p-[2px] rounded-full overflow-hidden ${containerSize}`}>
          {/* CSS Initials Fallback - always rendered underneath */}
          <div 
            className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white select-none`}
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
          
          {/* Image overlay - only if src exists and hasn't errored */}
          {src && !showFallback && (
            <img 
              src={src}
              alt={`${username}'s avatar`}
              className="w-full h-full object-cover rounded-full absolute inset-0"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Avatar;