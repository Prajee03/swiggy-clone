import React, { useState } from 'react';

interface FoodImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: string;
}

export const FoodImage: React.FC<FoodImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackIcon = 'restaurant_menu',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-primary-fixed/70 via-surface-container to-surface-container-high text-primary p-2 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="material-symbols-outlined text-[24px] opacity-80">{fallbackIcon}</span>
        <span className="text-[10px] font-medium text-on-surface-variant line-clamp-1 mt-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
