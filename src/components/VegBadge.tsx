import React from 'react';
import type { DietType } from '../types';

export const VegBadge: React.FC<{ diet: DietType; size?: 'sm' | 'md' }> = ({
  diet,
  size = 'md',
}) => {
  const boxClass = size === 'sm' ? 'w-3 h-3 p-[1.5px]' : 'w-3.5 h-3.5 p-[2px]';
  if (diet === 'veg') {
    return (
      <span
        title="Pure Vegetarian"
        aria-label="Vegetarian"
        className={`${boxClass} rounded-[3px] bg-surface-container-lowest inline-flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#1d6d00]`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
      </span>
    );
  }

  return (
    <span
      title="Non-Vegetarian"
      aria-label="Non-Vegetarian"
      className={`${boxClass} rounded-[3px] bg-surface-container-lowest inline-flex items-center justify-center shrink-0 shadow-[inset_0_0_0_1.5px_#ba1a1a]`}
    >
      <span className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-tertiary" />
    </span>
  );
};
