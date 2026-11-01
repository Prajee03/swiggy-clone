import React, { useMemo, useState } from 'react';
import type { AppScreen, CartItem, DietType, MenuItem, Restaurant } from '../types';
import { FoodImage } from './FoodImage';
import { VegBadge } from './VegBadge';

interface RestaurantDetailViewProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  cart: CartItem[];
  appliedCoupon: string | null;
  highlightDishId?: string | null;
  onToggleFavorite: () => void;
  onApplyCoupon: (code: string) => void;
  onAddOrCustomizeDish: (restaurant: Restaurant, dish: MenuItem) => void;
  onUpdateDishQty: (dishId: string, delta: number) => void;
  onNavigate: (screen: AppScreen) => void;
  onShowToast: (msg: string) => void;
}

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  restaurant,
  isFavorite,
  cart,
  appliedCoupon,
  highlightDishId,
  onToggleFavorite,
  onApplyCoupon,
  onAddOrCustomizeDish,
  onUpdateDishQty,
  onNavigate,
  onShowToast,
}) => {
  const [menuQuery, setMenuQuery] = useState('');
  const [activeDiet, setActiveDiet] = useState<DietType | null>(null);
  const [bestsellerOnly, setBestsellerOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(
    restaurant.categories[0] || 'Recommended',
  );
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const dishQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      if (item.restaurantId === restaurant.id) {
        map[item.itemId] = (map[item.itemId] || 0) + item.qty;
      }
    }
    return map;
  }, [cart, restaurant.id]);

  const filteredMenu = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return restaurant.menu.filter((item) => {
      if (activeDiet && item.diet !== activeDiet) return false;
      if (bestsellerOnly && !item.badge) return false;
      if (spicyOnly && !item.isSpicy) return false;
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [restaurant.menu, menuQuery, activeDiet, bestsellerOnly, spicyOnly]);

  const groupedByCategory = useMemo(() => {
    const groups: Array<{ category: string; items: MenuItem[] }> = [];
    for (const cat of restaurant.categories) {
      const items = filteredMenu.filter((m) => m.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    // Catch any items not listed in categories
    const coveredIds = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
    const remaining = filteredMenu.filter((m) => !coveredIds.has(m.id));
    if (remaining.length > 0) {
      groups.push({ category: 'More Specialties', items: remaining });
    }
    return groups;
  }, [restaurant.categories, filteredMenu]);

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat);
    const slug = `cat-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const el = document.getElementById(slug);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onShowToast(`Copied link to ${restaurant.name}`);
    } catch {
      onShowToast(`Sharing ${restaurant.name} (${restaurant.locality})`);
    }
  };

  const cartSummary = useMemo(() => {
    const totalQty = cart.reduce((acc, c) => acc + c.qty, 0);
    const totalPrice = cart.reduce((acc, c) => acc + c.unitPrice * c.qty, 0);
    return { totalQty, totalPrice };
  }, [cart]);

  return (
    <div className="max-w-7xl mx-auto w-full pb-28 lg:pb-16">
      <div className="px-4 lg:px-6 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Restaurant Info + Filters + Menu */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Restaurant Header Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high flex flex-col gap-3.5">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                {restaurant.isPremiumPartner && (
                  <div className="flex items-center gap-1 text-primary-container text-[11px] font-bold tracking-wide uppercase mb-1">
                    <span className="material-symbols-outlined material-symbols-filled text-[14px]">
                      verified
                    </span>
                    <span>Premium Partner</span>
                  </div>
                )}
                <h2 className="font-display font-extrabold text-2xl text-on-surface truncate">
                  {restaurant.name}
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 truncate">
                  {restaurant.cuisines.join(', ')}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant tabular-nums">
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    location_on
                  </span>
                  <span className="truncate">
                    {restaurant.locality}, {restaurant.city}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-on-surface">{restaurant.distanceKm} km</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  onClick={onToggleFavorite}
                  className="w-11 h-11 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
                >
                  <span
                    className={`material-symbols-outlined text-[21px] ${
                      isFavorite ? 'material-symbols-filled text-tertiary' : ''
                    }`}
                  >
                    {isFavorite ? 'favorite' : 'favorite_border'}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Share Restaurant"
                  onClick={handleShare}
                  className="w-11 h-11 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
              </div>
            </div>

            {/* Rating & Delivery Metrics Strip */}
            <div className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between text-center gap-2 tabular-nums">
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-secondary font-bold text-xs sm:text-sm">
                  <span className="material-symbols-outlined material-symbols-filled text-[16px]">
                    star
                  </span>
                  <span>{restaurant.rating}</span>
                  <span className="text-on-surface-variant font-normal text-xs">
                    ({restaurant.ratingCount})
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">Ratings</span>
              </div>

              <div className="w-px h-7 bg-surface-variant" />

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 text-on-surface font-bold text-xs sm:text-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary-container">
                    schedule
                  </span>
                  <span>{restaurant.deliveryRange}</span>
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">Delivery Time</span>
              </div>

              <div className="w-px h-7 bg-surface-variant" />

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-0.5 text-on-surface font-bold text-xs sm:text-sm">
                  <span>{restaurant.costForTwoLabel}</span>
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">Cost</span>
              </div>
            </div>
          </div>

          {/* Offers Carousel */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {restaurant.offers.map((offer) => {
              const isApplied = appliedCoupon === offer.code;
              const iconBg =
                offer.tone === 'primary'
                  ? 'bg-primary-container/15 text-primary-container'
                  : offer.tone === 'secondary'
                    ? 'bg-secondary-container/40 text-secondary'
                    : 'bg-tertiary-fixed text-tertiary';

              return (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => onApplyCoupon(offer.code)}
                  className={`min-w-[255px] max-w-[280px] text-left rounded-xl p-3 shadow-xs border flex items-center gap-3 shrink-0 transition-all active:scale-98 ${
                    isApplied
                      ? 'bg-secondary-container/25 border-secondary'
                      : 'bg-surface-container-lowest border-surface-container-high hover:border-primary-container/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{offer.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-on-surface truncate">{offer.title}</p>
                      {isApplied && (
                        <span className="text-[10px] font-bold text-secondary shrink-0">
                          APPLIED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      {offer.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search in Menu */}
          <div className="bg-surface-container-lowest rounded-xl flex items-center px-3.5 h-11 shadow-xs border border-surface-container-high gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder={`Search in ${restaurant.name}...`}
              aria-label={`Search menu in ${restaurant.name}`}
              className="bg-transparent flex-1 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
            />
            {menuQuery && (
              <button
                type="button"
                aria-label="Clear menu search"
                onClick={() => setMenuQuery('')}
                className="text-on-surface-variant flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Dietary & Bestseller Filter Controls */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveDiet((d) => (d === 'veg' ? null : 'veg'))}
              className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeDiet === 'veg'
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
              }`}
            >
              <VegBadge diet="veg" size="sm" />
              <span>Veg</span>
            </button>

            {!restaurant.isPureVeg && (
              <button
                type="button"
                onClick={() => setActiveDiet((d) => (d === 'non-veg' ? null : 'non-veg'))}
                className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeDiet === 'non-veg'
                    ? 'bg-tertiary text-on-tertiary'
                    : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
                }`}
              >
                <VegBadge diet="non-veg" size="sm" />
                <span>Non-Veg</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setBestsellerOnly((v) => !v)}
              className={`h-9 px-3.5 rounded-full flex items-center gap-1 shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                bestsellerOnly
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined material-symbols-filled text-[15px] text-primary-container">
                local_fire_department
              </span>
              <span>Bestseller</span>
            </button>

            <button
              type="button"
              onClick={() => setSpicyOnly((v) => !v)}
              className={`h-9 px-3.5 rounded-full flex items-center gap-1 shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                spicyOnly
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px] text-tertiary">
                local_dining
              </span>
              <span>Andhra Special</span>
            </button>
          </div>

          {/* Sticky Horizontal Category Navigation */}
          <div className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md -mx-4 px-4 lg:mx-0 lg:px-0 py-2 border-b border-surface-container-high">
            <div className="flex overflow-x-auto no-scrollbar gap-5">
              {groupedByCategory.map(({ category, items }) => {
                const isSelected = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => scrollToCategory(category)}
                    className={`whitespace-nowrap text-xs pb-1.5 relative transition-colors tabular-nums ${
                      isSelected
                        ? 'text-primary font-bold'
                        : 'text-on-surface-variant font-semibold hover:text-on-surface'
                    }`}
                  >
                    {category} ({items.length})
                    {isSelected && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Sections */}
          <div className="flex flex-col gap-6 pt-1">
            {groupedByCategory.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container-high">
                <p className="font-display font-bold text-sm text-on-surface">
                  No dishes match your current filter
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDiet(null);
                    setBestsellerOnly(false);
                    setSpicyOnly(false);
                    setMenuQuery('');
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
                >
                  Show Full Menu
                </button>
              </div>
            ) : (
              groupedByCategory.map(({ category, items }) => {
                const slug = `cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const isCollapsed = Boolean(collapsedCategories[category]);

                return (
                  <section key={category} id={slug} className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => ({
                          ...prev,
                          [category]: !prev[category],
                        }))
                      }
                      className="flex items-center justify-between py-1 text-left"
                    >
                      <h3 className="font-display font-bold text-lg text-on-surface tabular-nums">
                        {category} ({items.length})
                      </h3>
                      <span
                        className={`material-symbols-outlined text-on-surface-variant text-[22px] transition-transform ${
                          isCollapsed ? '' : 'rotate-180'
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="flex flex-col gap-3.5">
                        {items.map((dish) => {
                          const qty = dishQtyMap[dish.id] || 0;
                          const isHighlighted = highlightDishId === dish.id;

                          return (
                            <article
                              key={dish.id}
                              className={`bg-surface-container-lowest rounded-2xl p-4 shadow-xs border flex justify-between gap-4 items-start relative transition-colors ${
                                isHighlighted
                                  ? 'border-primary-container ring-2 ring-primary-container/20'
                                  : 'border-surface-container-high/80'
                              }`}
                            >
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <VegBadge diet={dish.diet} />
                                  {dish.badge && (
                                    <span className="text-[11px] font-bold text-primary-container tracking-tight">
                                      {dish.badge === 'bestseller'
                                        ? '★ Bestseller'
                                        : dish.badge === 'must-try'
                                          ? 'Must Try'
                                          : "Chef's Special"}
                                    </span>
                                  )}
                                </div>

                                <h4 className="font-display font-bold text-[16px] text-on-surface mt-0.5">
                                  {dish.name}
                                </h4>

                                <div className="text-sm font-bold text-on-surface tabular-nums">
                                  ₹{dish.price}
                                </div>

                                <div className="flex items-center gap-1 mt-0.5 text-secondary text-xs font-semibold tabular-nums">
                                  <span className="material-symbols-outlined material-symbols-filled text-[14px]">
                                    star
                                  </span>
                                  <span>{dish.rating}</span>
                                  <span className="text-on-surface-variant font-normal">
                                    ({dish.ratingCount})
                                  </span>
                                </div>

                                <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                                  {dish.description}
                                </p>
                              </div>

                              {/* Dish Image & Stepper */}
                              <div className="w-28 sm:w-32 flex flex-col items-center shrink-0 relative pb-3">
                                <div className="w-28 h-28 sm:w-32 sm:h-28 rounded-xl overflow-hidden shadow-xs bg-surface-container">
                                  <FoodImage src={dish.image} alt={dish.name} />
                                </div>

                                <div className="absolute bottom-0 w-24 sm:w-26 z-10 flex flex-col items-center">
                                  {qty > 0 ? (
                                    <div className="w-full bg-surface-container-lowest shadow-md border border-surface-container-high rounded-lg h-9 flex items-center justify-between px-1.5 text-secondary font-bold tabular-nums">
                                      <button
                                        type="button"
                                        aria-label={`Decrease quantity of ${dish.name}`}
                                        onClick={() => onUpdateDishQty(dish.id, -1)}
                                        className="w-7 h-7 flex items-center justify-center active:scale-75 text-on-surface-variant hover:text-on-surface"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          remove
                                        </span>
                                      </button>
                                      <span className="text-secondary font-extrabold text-sm">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label={`Increase quantity of ${dish.name}`}
                                        onClick={() =>
                                          dish.customizable
                                            ? onAddOrCustomizeDish(restaurant, dish)
                                            : onUpdateDishQty(dish.id, 1)
                                        }
                                        className="w-7 h-7 flex items-center justify-center active:scale-75 text-secondary"
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          add
                                        </span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onAddOrCustomizeDish(restaurant, dish)}
                                      className="w-full bg-surface-container-lowest shadow-md border border-surface-container-high rounded-lg h-9 flex items-center justify-center gap-1 text-xs text-secondary font-extrabold hover:bg-surface-container-low active:scale-95 transition-all"
                                    >
                                      <span>ADD</span>
                                      <span className="material-symbols-outlined text-[16px]">
                                        add
                                      </span>
                                    </button>
                                  )}
                                  {dish.customizable && (
                                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                                      customizable
                                    </span>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}

            {/* FSSAI License & Hygiene Footnote */}
            <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-1.5 mt-2">
              <div className="flex items-center gap-3">
                <span className="font-display font-extrabold text-sm text-on-surface-variant tracking-wide lowercase">
                  fssai
                </span>
                <div className="w-px h-4 bg-surface-variant" />
                <span className="text-xs text-on-surface-variant tabular-nums">
                  License No. {restaurant.fssaiLicense}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">{restaurant.fullAddress}</p>
            </div>
          </div>
        </div>

        {/* Right Column (Desktop Sticky Cart Module) */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24">
          <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <h3 className="font-display font-bold text-lg text-on-surface">Your Order</h3>
              <span className="text-xs font-semibold text-on-surface-variant tabular-nums">
                {cartSummary.totalQty} {cartSummary.totalQty === 1 ? 'item' : 'items'}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-[34px] text-outline-variant">
                  shopping_bag
                </span>
                <p className="text-sm font-semibold text-on-surface">Cart is empty</p>
                <p className="text-xs text-on-surface-variant">
                  Add freshly prepared biryanis, starters, or desserts from the menu.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.cartKey} className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="mt-1">
                          <VegBadge diet={item.diet} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface truncate">
                            {item.name}
                          </p>
                          {item.selectedOptions.length > 0 && (
                            <p className="text-[11px] text-on-surface-variant truncate">
                              {item.selectedOptions.join(', ')}
                            </p>
                          )}
                          <p className="text-xs font-bold text-on-surface mt-0.5 tabular-nums">
                            ₹{item.unitPrice * item.qty}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center bg-surface-container-low rounded-lg px-1 py-0.5 shrink-0 tabular-nums">
                        <button
                          type="button"
                          onClick={() => onUpdateDishQty(item.itemId, -1)}
                          className="w-6 h-6 flex items-center justify-center text-primary-container font-bold"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-on-surface">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateDishQty(item.itemId, 1)}
                          className="w-6 h-6 flex items-center justify-center text-primary-container font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-surface-container-high space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-on-surface tabular-nums">
                    <span>Subtotal</span>
                    <span>₹{cartSummary.totalPrice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('cart')}
                    className="w-full py-3.5 rounded-xl bg-primary-container text-on-primary font-display font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-98 transition-all"
                  >
                    <span>VIEW CART & CHECKOUT</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Floating Sticky Bottom Bar for Cart Checkout */}
      {cartSummary.totalQty > 0 && (
        <aside className="lg:hidden fixed bottom-18 inset-x-4 z-30">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="w-full max-w-lg mx-auto bg-primary-container text-on-primary rounded-2xl h-14 px-4 shadow-xl flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="flex flex-col text-left tabular-nums">
              <span className="text-[10px] font-bold tracking-wider uppercase text-on-primary/90">
                {cartSummary.totalQty} ITEM{cartSummary.totalQty > 1 ? 'S' : ''} ADDED
              </span>
              <span className="font-display font-bold text-base text-on-primary">
                ₹{cartSummary.totalPrice}{' '}
                <span className="text-xs text-on-primary/80 font-normal">plus taxes</span>
              </span>
            </div>
            <div className="flex items-center gap-1 font-display font-bold text-sm text-on-primary">
              <span>VIEW CART</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </div>
          </button>
        </aside>
      )}
    </div>
  );
};
