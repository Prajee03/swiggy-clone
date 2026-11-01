import React from 'react';
import type { AppScreen } from '../types';

interface BottomNavProps {
  screen: AppScreen;
  cartCount: number;
  onNavigate: (screen: AppScreen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ screen, cartCount, onNavigate }) => {
  const isFoodActive = screen === 'home' || screen === 'restaurant';

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl border-t border-surface-container-high shadow-[0_-4px_20px_rgba(30,34,43,0.06)]"
    >
      <div className="grid grid-cols-4 items-center h-16 px-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            isFoodActive ? 'text-primary-container font-bold' : 'text-on-surface-variant'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[23px] ${
              isFoodActive ? 'material-symbols-filled' : ''
            }`}
          >
            lunch_dining
          </span>
          <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">Food</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('instamart')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative ${
            screen === 'instamart' ? 'text-primary-container font-bold' : 'text-on-surface-variant'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[23px] ${
                screen === 'instamart' ? 'material-symbols-filled' : ''
              }`}
            >
              shopping_basket
            </span>
            <span className="absolute -top-1.5 -right-4 bg-secondary text-on-secondary text-[9px] px-1 py-0.2 rounded-full leading-tight font-bold tabular-nums">
              10m
            </span>
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">Instamart</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('dineout')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
            screen === 'dineout' ? 'text-primary-container font-bold' : 'text-on-surface-variant'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[23px] ${
              screen === 'dineout' ? 'material-symbols-filled' : ''
            }`}
          >
            restaurant
          </span>
          <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">Dineout</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('cart')}
          className={`flex flex-col items-center justify-center min-h-[44px] transition-colors relative ${
            screen === 'cart' ? 'text-primary-container font-bold' : 'text-on-surface-variant'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined text-[23px] ${
                screen === 'cart' ? 'material-symbols-filled' : ''
              }`}
            >
              local_mall
            </span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2.5 bg-primary-container text-on-primary text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none font-bold tabular-nums">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">Cart</span>
        </button>
      </div>
    </nav>
  );
};
