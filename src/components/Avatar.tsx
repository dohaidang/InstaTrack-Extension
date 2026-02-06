import React, { useState } from 'react';

interface AvatarProps {
  src?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, username = 'user', size = 'md', hasStory = false, className = '' }) => {
  const [useFallback, setUseFallback] = useState(!src);

  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const containerSize = sizeClasses[size];
  
  // Generate fallback URL using ui-avatars.com with colorful backgrounds
  const getFallbackUrl = () => {
    const name = username || 'user';
    const colors = ['E91E63', '9C27B0', '673AB7', '3F51B5', '2196F3', '00BCD4', '009688', '4CAF50', 'FF9800', 'FF5722'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.substring(0, 2))}&background=${bgColor}&color=fff&bold=true&size=128`;
  };

  const handleError = () => {
    setUseFallback(true);
  };

  // Always use fallback if no src or if src failed
  const imageUrl = useFallback ? getFallbackUrl() : src;
  
  return (
    <div className={`relative ${className}`}>
      <div className={`${hasStory ? 'p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2b8c] to-[#6228d7]' : ''} rounded-full`}>
        <div className={`bg-white dark:bg-background-dark p-[2px] rounded-full overflow-hidden ${containerSize}`}>
          <img 
            src={imageUrl} 
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};

export default Avatar;