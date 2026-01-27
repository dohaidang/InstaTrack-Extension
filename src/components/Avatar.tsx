import React from 'react';

interface AvatarProps {
  src: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, size = 'md', hasStory = false, className = '' }) => {
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const containerSize = sizeClasses[size];
  
  return (
    <div className={`relative ${className}`}>
      <div className={`${hasStory ? 'p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2b8c] to-[#6228d7]' : ''} rounded-full`}>
        <div className={`bg-white dark:bg-background-dark p-[2px] rounded-full`}>
          <div 
            className={`${containerSize} bg-center bg-no-repeat bg-cover rounded-full`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Avatar;