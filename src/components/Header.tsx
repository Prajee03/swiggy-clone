import React from 'react';
import type { AppScreen, OrderRecord, SavedAddress } from '../types';
import { BRAND_ASSETS } from '../data/catalog';
import { FoodImage } from './FoodImage';

interface HeaderProps {
  screen: AppScreen;
  selectedAddress: SavedAddress;
  cartCount: number;
  activeOrder: OrderRecord | null;
  onNavigate: (screen: AppScreen) => void;
  onOpenAddressModal: () => void;
  onOpenProfileModal: () => void;
  subPageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  screen,
  selectedAddress,
  cartCount,
  activeOrder,
  onNavigate,
  onOpenAddressModal,
  onOpenProfileModal,
  subPageTitle,
}) => {
  const isStackScreen = screen === 'restaurant' || screen === 'tracking' || screen === 'genie';

  return (
    <header className="sticky top-0 w-full z-40 bg-surface-container-lowest/92 backdrop-blur-xl border-b border-surface-container-high/80 pt-safe">
      <div className="max-w-7xl mx-auto h-16 px-4 lg:px-6 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand & Contextual Back / Location */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isStackScreen && (
            <button
              type="button"
              aria-label="Back"
              onClick={() => onNavigate('home')}
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container-low active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 shrink-0 focus:outline-none group"
          >
            <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0">
              <FoodImage
                src={BRAND_ASSETS.logo}
                alt="Swiggy"
                className="h-full w-full object-contain"
                fallbackIcon="lunch_dining"
              />
            </div>
            <span className="hidden sm:inline font-display font-extrabold text-lg tracking-tight text-on-surface whitespace-nowrap">
              Swiggy
            </span>
          </button>

          {isStackScreen && subPageTitle ? (
            <div className="flex items-center gap-2 min-w-0 pl-1">
              <span className="text-outline-variant hidden sm:inline">/</span>
              <h1 className="font-display font-bold text-[16px] text-on-surface truncate">
                {subPageTitle}
              </h1>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAddressModal}
              className="flex flex-col min-w-0 text-left pl-1 py-1 rounded-lg hover:bg-surface-container-low/70 px-1.5 transition-colors"
            >
              <div className="flex items-center gap-1">
                <span className="font-display font-bold text-[15px] text-on-surface truncate">
                  {selectedAddress.label}
                </span>
                <span className="material-symbols-outlined text-[18px] text-primary-container shrink-0">
                  expand_more
                </span>
              </div>
              <p className="text-[12px] text-on-surface-variant truncate max-w-[185px] sm:max-w-[260px]">
                {selectedAddress.shortArea}
              </p>
            </button>
          )}
        </div>

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-on-surface-variant">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              screen === 'home' || screen === 'restaurant'
                ? 'text-primary-container border-primary-container'
                : 'border-transparent hover:text-on-surface'
            }`}
          >
            Food Delivery
          </button>
          <button
            type="button"
            onClick={() => onNavigate('instamart')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              screen === 'instamart'
                ? 'text-primary-container border-primary-container'
                : 'border-transparent hover:text-on-surface'
            }`}
          >
            Instamart · 10m
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dineout')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              screen === 'dineout'
                ? 'text-primary-container border-primary-container'
                : 'border-transparent hover:text-on-surface'
            }`}
          >
            Dineout
          </button>
          <button
            type="button"
            onClick={() => onNavigate('genie')}
            className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
              screen === 'genie'
                ? 'text-primary-container border-primary-container'
                : 'border-transparent hover:text-on-surface'
            }`}
          >
            Genie
          </button>
          {activeOrder && (
            <button
              type="button"
              onClick={() => onNavigate('tracking')}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                screen === 'tracking'
                  ? 'text-secondary border-secondary'
                  : 'text-secondary border-transparent hover:opacity-80'
              }`}
            >
              Track Order ({activeOrder.etaMinutes > 0 ? `${activeOrder.etaMinutes}m` : 'Delivered'})
            </button>
          )}
        </nav>

        {/* Zone 3: Right Contextual Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {activeOrder && screen !== 'tracking' ? (
            <button
              type="button"
              onClick={() => onNavigate('tracking')}
              className="lg:hidden flex items-center gap-1.5 bg-secondary text-on-secondary px-3 py-1.5 rounded-full text-xs font-bold shadow-xs active:scale-95 transition-transform whitespace-nowrap tabular-nums"
            >
              <span className="material-symbols-outlined text-[15px]">two_wheeler</span>
              <span>
                {activeOrder.status === 'delivered'
                  ? 'Delivered'
                  : `${activeOrder.etaMinutes}m`}
              </span>
            </button>
          ) : (
            !isStackScreen && (
              <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap tabular-nums hidden xs:inline">
                {selectedAddress.deliveryMins} mins
              </span>
            )
          )}

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:opacity-95 active:scale-98 transition-all whitespace-nowrap shrink-0 tabular-nums"
          >
            <span className="material-symbols-outlined text-[17px]">local_mall</span>
            <span>Cart {cartCount > 0 ? `(${cartCount})` : ''}</span>
          </button>

          <button
            type="button"
            aria-label="Account and Past Orders"
            onClick={onOpenProfileModal}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-surface-container-high">
              <FoodImage
                src={BRAND_ASSETS.profileAvatar}
                alt="User Profile"
                className="w-full h-full object-cover"
                fallbackIcon="person"
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
