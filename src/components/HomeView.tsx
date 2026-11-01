import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AppScreen, CartItem, MenuItem, Restaurant } from '../types';
import { BRAND_ASSETS, CUISINE_CATEGORIES, HERO_BANNERS } from '../data/catalog';
import { FoodImage } from './FoodImage';
import { VegBadge } from './VegBadge';

interface HomeViewProps {
  restaurants: Restaurant[];
  favorites: string[];
  cart: CartItem[];
  appliedCoupon: string | null;
  onSelectRestaurant: (restaurantId: string, highlightDishId?: string) => void;
  onToggleFavorite: (restaurantId: string) => void;
  onApplyCoupon: (code: string) => void;
  onQuickAddDish: (restaurant: Restaurant, dish: MenuItem) => void;
  onNavigate: (screen: AppScreen) => void;
  onShowToast: (msg: string) => void;
}

type SortOption = 'relevance' | 'delivery_time' | 'rating' | 'cost_low' | 'cost_high';

const ROTATING_PLACEHOLDERS = [
  'Search "Biryani", "Pizza", or "Burger"',
  'Search "Meghana", "Butter Chicken", "Dosa"',
  'Search "Death By Chocolate", "Wings"',
  'Search "Shawarma", "Rolls", "Paneer 65"',
];

export const HomeView: React.FC<HomeViewProps> = ({
  restaurants,
  favorites,
  cart,
  appliedCoupon,
  onSelectRestaurant,
  onToggleFavorite,
  onApplyCoupon,
  onQuickAddDish,
  onNavigate,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
  const [rating4PlusOnly, setRating4PlusOnly] = useState(false);
  const [pureVegOnly, setPureVegOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [midPriceOnly, setMidPriceOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const chainsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerIdx((i) => (i + 1) % HERO_BANNERS.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, []);

  const handleVoiceSearch = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsListening(true);
      window.setTimeout(() => {
        setIsListening(false);
        setSearchQuery('Biryani');
        onShowToast('Voice search matched "Biryani"');
      }, 1200);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setSearchQuery(transcript);
          onShowToast(`Searching for "${transcript}"`);
        }
        setIsListening(false);
      };
      recognition.onerror = () => {
        setIsListening(false);
        setSearchQuery('Chicken Biryani');
        onShowToast('Voice search matched "Chicken Biryani"');
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const scrollChains = (dir: 'left' | 'right') => {
    if (!chainsContainerRef.current) return;
    chainsContainerRef.current.scrollBy({
      left: dir === 'left' ? -280 : 280,
      behavior: 'smooth',
    });
  };

  const topChains = useMemo(
    () => restaurants.filter((r) => r.isTopChain),
    [restaurants],
  );

  const matchingDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: Array<{ restaurant: Restaurant; dish: MenuItem }> = [];
    for (const rest of restaurants) {
      for (const dish of rest.menu) {
        if (
          dish.name.toLowerCase().includes(q) ||
          dish.category.toLowerCase().includes(q) ||
          dish.description.toLowerCase().includes(q)
        ) {
          results.push({ restaurant: rest, dish });
        }
      }
    }
    return results.slice(0, 6);
  }, [restaurants, searchQuery]);

  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = restaurants.filter((r) => {
      if (selectedCuisine) {
        const matchesCuisine =
          r.cuisines.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase())) ||
          r.menu.some((m) => m.category.toLowerCase().includes(selectedCuisine.toLowerCase()));
        if (!matchesCuisine) return false;
      }
      if (fastDeliveryOnly && r.deliveryMins > 25) return false;
      if (rating4PlusOnly && r.rating < 4.5) return false;
      if (pureVegOnly && !r.isPureVeg) return false;
      if (offersOnly && r.offers.length === 0) return false;
      if (midPriceOnly && (r.costForTwo < 300 || r.costForTwo > 600)) return false;

      if (q) {
        const nameMatch = r.name.toLowerCase().includes(q);
        const cuisineMatch = r.cuisines.some((c) => c.toLowerCase().includes(q));
        const dishMatch = r.menu.some((m) => m.name.toLowerCase().includes(q));
        if (!nameMatch && !cuisineMatch && !dishMatch) return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'delivery_time') {
      sorted.sort((a, b) => a.deliveryMins - b.deliveryMins);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'cost_low') {
      sorted.sort((a, b) => a.costForTwo - b.costForTwo);
    } else if (sortBy === 'cost_high') {
      sorted.sort((a, b) => b.costForTwo - a.costForTwo);
    }
    return sorted;
  }, [
    restaurants,
    searchQuery,
    selectedCuisine,
    fastDeliveryOnly,
    rating4PlusOnly,
    pureVegOnly,
    offersOnly,
    midPriceOnly,
    sortBy,
  ]);

  const activeFilterCount = [
    Boolean(selectedCuisine),
    fastDeliveryOnly,
    rating4PlusOnly,
    pureVegOnly,
    offersOnly,
    midPriceOnly,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCuisine(null);
    setFastDeliveryOnly(false);
    setRating4PlusOnly(false);
    setPureVegOnly(false);
    setOffersOnly(false);
    setMidPriceOnly(false);
    setSortBy('relevance');
    setSearchQuery('');
  };

  const cartSummary = useMemo(() => {
    const qty = cart.reduce((acc, c) => acc + c.qty, 0);
    const total = cart.reduce((acc, c) => acc + c.unitPrice * c.qty, 0);
    const restName = cart[0]?.restaurantName || 'Cart';
    return { qty, total, restName };
  }, [cart]);

  const activeBanner = HERO_BANNERS[bannerIdx];

  return (
    <div className="max-w-7xl mx-auto w-full pb-28 lg:pb-16">
      {/* Search Bar */}
      <div className="px-4 lg:px-6 pt-3">
        <div className="relative flex items-center bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(30,34,43,0.06)] border border-surface-container-high h-12 px-4">
          <span className="material-symbols-outlined text-outline text-[22px] mr-3 select-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ROTATING_PLACEHOLDERS[placeholderIdx]}
            aria-label="Search restaurants and dishes"
            className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
          <div className="h-5 w-px bg-surface-container-high mx-1.5" />
          <button
            type="button"
            aria-label="Voice Search"
            onClick={handleVoiceSearch}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              isListening
                ? 'bg-primary-container text-on-primary'
                : 'hover:bg-surface-container-low text-primary-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isListening ? 'graphic_eq' : 'mic'}
            </span>
          </button>
        </div>
      </div>

      {/* Instant Dish Search Results */}
      {matchingDishes.length > 0 && (
        <section className="px-4 lg:px-6 mt-4">
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container-high">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-on-surface">
                Matching Dishes ({matchingDishes.length})
              </h2>
              <span className="text-xs text-on-surface-variant">Tap to order directly</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchingDishes.map(({ restaurant, dish }) => (
                <div
                  key={dish.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-container-low/60 hover:bg-surface-container-low transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(restaurant.id, dish.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                      <FoodImage src={dish.image} alt={dish.name} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <VegBadge diet={dish.diet} size="sm" />
                        <p className="font-semibold text-sm text-on-surface truncate">
                          {dish.name}
                        </p>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {restaurant.name} · <span className="tabular-nums font-semibold text-on-surface">₹{dish.price}</span>
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickAddDish(restaurant, dish)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-secondary font-bold text-xs shadow-xs hover:bg-secondary hover:text-on-secondary transition-colors shrink-0"
                  >
                    + ADD
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hero Campaign + Service Switcher Grid (Responsive 2-Col Split on Desktop) */}
      <div className="px-4 lg:px-6 mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Hero Offer Banner Carousel */}
        <div className="lg:col-span-7">
          <div
            className={`relative h-full w-full rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(252,128,25,0.14)] bg-gradient-to-r ${activeBanner.gradient} text-on-primary p-5 flex flex-col justify-between transition-colors duration-300`}
          >
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex-1 flex flex-col justify-center space-y-1.5 min-w-0">
                <span className="text-[11px] font-bold tracking-wider uppercase text-white/85">
                  {activeBanner.tag}
                </span>
                <h2 className="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight text-white">
                  {activeBanner.headline}
                  <br />
                  <span className="text-secondary-fixed text-base sm:text-lg font-bold">
                    {activeBanner.subheadline}
                  </span>
                </h2>
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onApplyCoupon(activeBanner.code)}
                    className="text-xs font-bold bg-white text-on-primary-container px-3 py-1.5 rounded-lg shadow-xs hover:bg-primary-fixed active:scale-95 transition-all whitespace-nowrap"
                  >
                    {appliedCoupon === activeBanner.code
                      ? `✓ ${activeBanner.code} APPLIED`
                      : `APPLY ${activeBanner.code}`}
                  </button>
                  <span className="text-xs text-white/90">{activeBanner.minOrderText}</span>
                </div>
              </div>
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden shadow-md">
                <FoodImage src={activeBanner.image} alt={activeBanner.headline} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="flex justify-center items-center gap-1.5 pt-3">
              {HERO_BANNERS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-label={`View offer ${i + 1}`}
                  onClick={() => setBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === bannerIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 4-Service Switcher Grid */}
        <div className="lg:col-span-5 grid grid-cols-4 lg:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('restaurants-feed');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col lg:flex-row items-center lg:gap-3 bg-surface-container-lowest p-2.5 lg:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(30,34,43,0.05)] border border-surface-container-high active:scale-95 transition-transform text-center lg:text-left"
          >
            <div className="w-full lg:w-14 aspect-square rounded-xl bg-orange-50 flex items-center justify-center p-2 mb-1.5 lg:mb-0 shrink-0 overflow-hidden">
              <FoodImage
                src={BRAND_ASSETS.serviceFood}
                alt="Food Delivery"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs lg:text-sm text-on-surface truncate">
                Food
              </p>
              <p className="text-[10px] lg:text-xs text-primary-container font-semibold">
                Up to 50% Off
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('instamart')}
            className="flex flex-col lg:flex-row items-center lg:gap-3 bg-surface-container-lowest p-2.5 lg:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(30,34,43,0.05)] border border-surface-container-high active:scale-95 transition-transform text-center lg:text-left relative"
          >
            <div className="w-full lg:w-14 aspect-square rounded-xl bg-emerald-50 flex items-center justify-center p-2 mb-1.5 lg:mb-0 shrink-0 relative overflow-hidden">
              <FoodImage
                src={BRAND_ASSETS.serviceInstamart}
                alt="Instamart Groceries"
                className="w-full h-full object-contain rounded-lg"
              />
              <span className="absolute top-1 right-1 bg-secondary text-on-secondary text-[9px] px-1 py-0.5 rounded leading-none font-bold tabular-nums">
                10m
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs lg:text-sm text-on-surface truncate">
                Instamart
              </p>
              <p className="text-[10px] lg:text-xs text-secondary font-semibold">Instant Grocery</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dineout')}
            className="flex flex-col lg:flex-row items-center lg:gap-3 bg-surface-container-lowest p-2.5 lg:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(30,34,43,0.05)] border border-surface-container-high active:scale-95 transition-transform text-center lg:text-left relative"
          >
            <div className="w-full lg:w-14 aspect-square rounded-xl bg-red-50 flex items-center justify-center p-2 mb-1.5 lg:mb-0 shrink-0 relative overflow-hidden">
              <FoodImage
                src={BRAND_ASSETS.serviceDineout}
                alt="Dineout"
                className="w-full h-full object-contain rounded-lg"
              />
              <span className="absolute top-1 right-1 bg-tertiary text-on-tertiary text-[9px] px-1 py-0.5 rounded leading-none font-bold tabular-nums">
                30% OFF
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs lg:text-sm text-on-surface truncate">
                Dineout
              </p>
              <p className="text-[10px] lg:text-xs text-tertiary font-semibold">Book & Pay Bill</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('genie')}
            className="flex flex-col lg:flex-row items-center lg:gap-3 bg-surface-container-lowest p-2.5 lg:p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(30,34,43,0.05)] border border-surface-container-high active:scale-95 transition-transform text-center lg:text-left"
          >
            <div className="w-full lg:w-14 aspect-square rounded-xl bg-indigo-50 flex items-center justify-center p-2 mb-1.5 lg:mb-0 shrink-0 overflow-hidden">
              <FoodImage
                src={BRAND_ASSETS.serviceGenie}
                alt="Swiggy Genie"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs lg:text-sm text-on-surface truncate">
                Genie
              </p>
              <p className="text-[10px] lg:text-xs text-on-surface-variant">Pick & Drop</p>
            </div>
          </button>
        </div>
      </div>

      {/* What's on your mind? Cuisine Rail */}
      <section className="mt-6 space-y-3">
        <div className="px-4 lg:px-6 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-on-surface tracking-tight">
              What's on your mind?
            </h3>
            <p className="text-xs text-on-surface-variant">Cravings delivered in minutes</p>
          </div>
          {selectedCuisine && (
            <button
              type="button"
              onClick={() => setSelectedCuisine(null)}
              className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-0.5 whitespace-nowrap"
            >
              Clear ({selectedCuisine})
            </button>
          )}
        </div>

        <div className="flex gap-4 lg:gap-6 overflow-x-auto px-4 lg:px-6 no-scrollbar pb-1">
          {CUISINE_CATEGORIES.map((cat) => {
            const isActive = selectedCuisine === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setSelectedCuisine((curr) => (curr === cat.id ? null : cat.id))
                }
                className="flex flex-col items-center shrink-0 active:scale-95 transition-transform w-[72px] group"
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden shadow-xs p-1 flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-primary-container ring-2 ring-primary-container/40'
                      : 'bg-surface-container-lowest group-hover:shadow-md'
                  }`}
                >
                  <FoodImage
                    src={cat.image}
                    alt={cat.label}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span
                  className={`text-xs mt-1.5 text-center truncate w-full ${
                    isActive ? 'font-bold text-primary-container' : 'font-semibold text-on-surface'
                  }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Top Restaurant Chains Near You */}
      <section className="mt-6 space-y-3">
        <div className="px-4 lg:px-6 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-on-surface tracking-tight">
              Top restaurant chains near you
            </h3>
            <p className="text-xs text-on-surface-variant">Bestsellers loved by locals</p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollChains('left')}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-variant active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollChains('right')}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-variant active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div
          ref={chainsContainerRef}
          className="flex gap-4 overflow-x-auto px-4 lg:px-6 no-scrollbar scroll-smooth pb-1"
        >
          {topChains.map((rest) => {
            const isFav = favorites.includes(rest.id);
            return (
              <div
                key={rest.id}
                className="w-[250px] sm:w-[270px] shrink-0 bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(30,34,43,0.06)] border border-surface-container-high/60 flex flex-col group hover:-translate-y-0.5 transition-transform"
              >
                <div className="relative w-full h-36">
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(rest.id)}
                    className="w-full h-full block text-left"
                  >
                    <FoodImage src={rest.heroImage} alt={rest.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute bottom-2.5 left-3 flex items-baseline gap-1.5">
                      <span className="font-display font-extrabold text-base text-white tracking-tight">
                        {rest.discountHeadline}
                      </span>
                      {rest.discountSubline && (
                        <span className="text-[10px] font-bold text-white/90">
                          {rest.discountSubline}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={() => onToggleFavorite(rest.id)}
                    className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center text-on-surface active:scale-90 transition-transform"
                  >
                    <span
                      className={`material-symbols-outlined text-[19px] ${
                        isFav ? 'material-symbols-filled text-tertiary' : ''
                      }`}
                    >
                      {isFav ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRestaurant(rest.id)}
                  className="p-3.5 flex flex-col space-y-1 text-left flex-1"
                >
                  <h4 className="font-display font-bold text-[16px] text-on-surface truncate">
                    {rest.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface font-semibold tabular-nums">
                    <span className="inline-flex items-center gap-0.5 text-secondary font-bold">
                      <span className="material-symbols-outlined material-symbols-filled text-[14px]">
                        star
                      </span>
                      {rest.rating}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{rest.deliveryMins} mins</span>
                  </div>
                  <p className="text-xs text-on-surface-variant truncate">
                    {rest.cuisines.join(', ')}
                  </p>
                  <p className="text-xs text-on-surface-variant tabular-nums">
                    {rest.locality} · {rest.distanceKm} km
                  </p>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sticky Filter & Sort Controls */}
      <div
        id="restaurants-feed"
        className="sticky top-16 z-30 bg-surface/95 backdrop-blur-md py-3 px-4 lg:px-6 mt-4 border-b border-surface-container-high/60"
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap ${
              activeFilterCount > 0
                ? 'bg-inverse-surface text-inverse-on-surface'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            <span>Filter {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
            <span className="material-symbols-outlined text-[15px]">tune</span>
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowSortMenu((v) => !v)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                sortBy !== 'relevance'
                  ? 'bg-inverse-surface text-inverse-on-surface'
                  : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
              }`}
            >
              <span>
                {sortBy === 'relevance'
                  ? 'Sort By'
                  : sortBy === 'delivery_time'
                    ? 'Fastest Delivery'
                    : sortBy === 'rating'
                      ? 'Rating 4.5+'
                      : sortBy === 'cost_low'
                        ? 'Cost: Low to High'
                        : 'Cost: High to Low'}
              </span>
              <span className="material-symbols-outlined text-[15px]">expand_more</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFastDeliveryOnly((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap ${
              fastDeliveryOnly
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            Fast Delivery
          </button>

          <button
            type="button"
            onClick={() => setRating4PlusOnly((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap ${
              rating4PlusOnly
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            Ratings 4.5+
          </button>

          <button
            type="button"
            onClick={() => setPureVegOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap ${
              pureVegOnly
                ? 'bg-secondary text-on-secondary'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            <VegBadge diet="veg" size="sm" />
            <span>Pure Veg</span>
          </button>

          <button
            type="button"
            onClick={() => setOffersOnly((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap ${
              offersOnly
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            Offers
          </button>

          <button
            type="button"
            onClick={() => setMidPriceOnly((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors whitespace-nowrap tabular-nums ${
              midPriceOnly
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
            }`}
          >
            ₹300 – ₹600
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-xs font-bold text-tertiary hover:underline whitespace-nowrap shrink-0"
            >
              Reset all
            </button>
          )}
        </div>

        {/* Sort Popover */}
        {showSortMenu && (
          <div className="mt-2 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container-high p-2 max-w-xs">
            {(
              [
                ['relevance', 'Relevance (Default)'],
                ['delivery_time', 'Delivery Time (Fastest first)'],
                ['rating', 'Rating (High to Low)'],
                ['cost_low', 'Cost for two: Low to High'],
                ['cost_high', 'Cost for two: High to Low'],
              ] as Array<[SortOption, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSortBy(key);
                  setShowSortMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  sortBy === key
                    ? 'bg-primary-fixed/60 text-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span>{label}</span>
                {sortBy === key && (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Restaurant Listing Feed */}
      <section className="px-4 lg:px-6 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base sm:text-lg text-on-surface tracking-tight tabular-nums">
            Restaurants to explore ({filteredRestaurants.length})
          </h3>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-8 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-[36px] text-outline">
              search_off
            </span>
            <h4 className="font-display font-bold text-base text-on-surface mt-2">
              No matching restaurants found
            </h4>
            <p className="text-xs text-on-surface-variant mt-1">
              Try clearing active dietary or price filters to explore all Bengaluru kitchens.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((rest) => {
              const isFav = favorites.includes(rest.id);
              return (
                <div
                  key={rest.id}
                  className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(30,34,43,0.05)] border border-surface-container-high/60 p-3.5 flex gap-3.5 items-start relative hover:shadow-md transition-shadow"
                >
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(rest.id)}
                    className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden shadow-xs block"
                  >
                    <FoodImage src={rest.heroImage} alt={rest.name} />
                    <div className="absolute top-1.5 left-1.5 bg-surface-container-lowest/90 backdrop-blur-xs p-0.5 rounded">
                      <VegBadge diet={rest.isPureVeg ? 'veg' : 'non-veg'} size="sm" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-surface-container-lowest/92 backdrop-blur-xs px-1.5 py-0.5 rounded text-[10px] text-on-surface font-bold tabular-nums">
                      {rest.deliveryMins} mins
                    </div>
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectRestaurant(rest.id)}
                          className="text-left min-w-0 flex-1"
                        >
                          <h4 className="font-display font-bold text-[16px] text-on-surface truncate hover:text-primary-container transition-colors">
                            {rest.name}
                          </h4>
                        </button>
                        <button
                          type="button"
                          aria-label={isFav ? 'Remove favorite' : 'Save favorite'}
                          onClick={() => onToggleFavorite(rest.id)}
                          className="w-8 h-8 -mt-1 -mr-1 flex items-center justify-center text-outline hover:text-tertiary transition-colors shrink-0"
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isFav ? 'material-symbols-filled text-tertiary' : ''
                            }`}
                          >
                            {isFav ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectRestaurant(rest.id)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs tabular-nums">
                          <span className="inline-flex items-center gap-0.5 text-secondary font-bold">
                            <span className="material-symbols-outlined material-symbols-filled text-[13px]">
                              star
                            </span>
                            {rest.rating}
                          </span>
                          <span aria-hidden="true" className="text-outline-variant">·</span>
                          <span className="text-on-surface font-semibold">
                            {rest.distanceKm} km
                          </span>
                          <span aria-hidden="true" className="text-outline-variant">·</span>
                          <span className="text-on-surface-variant">{rest.costForTwoLabel}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant truncate mt-1">
                          {rest.cuisines.join(', ')}
                        </p>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectRestaurant(rest.id)}
                      className="pt-2 text-left flex items-center gap-1 text-primary font-semibold text-xs truncate"
                    >
                      <span className="material-symbols-outlined text-[14px] text-primary-container shrink-0">
                        sell
                      </span>
                      <span className="truncate">{rest.discountHeadline}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter Drawer / Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <h3 className="font-display font-bold text-lg text-on-surface">
                Filter & Preferences
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="font-semibold text-on-surface">Fast Delivery (Under 25 mins)</span>
                <input
                  type="checkbox"
                  checked={fastDeliveryOnly}
                  onChange={(e) => setFastDeliveryOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary-container"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="font-semibold text-on-surface">Top Rated (4.5★ & above)</span>
                <input
                  type="checkbox"
                  checked={rating4PlusOnly}
                  onChange={(e) => setRating4PlusOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary-container"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="font-semibold text-on-surface">Pure Vegetarian Kitchens</span>
                <input
                  type="checkbox"
                  checked={pureVegOnly}
                  onChange={(e) => setPureVegOnly(e.target.checked)}
                  className="w-4 h-4 accent-secondary"
                />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low cursor-pointer">
                <span className="font-semibold text-on-surface">Mid-Range (₹300 – ₹600 for two)</span>
                <input
                  type="checkbox"
                  checked={midPriceOnly}
                  onChange={(e) => setMidPriceOnly(e.target.checked)}
                  className="w-4 h-4 accent-primary-container"
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-xs"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="flex-1 py-3 rounded-xl bg-primary-container text-on-primary font-bold text-xs"
              >
                Show {filteredRestaurants.length} Restaurants
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Sticky Cart Preview (Above Bottom Nav) */}
      {cartSummary.qty > 0 && (
        <div className="lg:hidden fixed bottom-18 left-0 right-0 px-4 z-30 pointer-events-none">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="w-full max-w-lg mx-auto pointer-events-auto bg-secondary text-on-secondary rounded-2xl shadow-[0_8px_24px_rgba(29,109,0,0.3)] px-4 py-3 flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-display font-bold text-sm leading-none shrink-0 tabular-nums">
                {cartSummary.qty}
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold tracking-wide truncate">
                  {cartSummary.restName} · {cartSummary.qty} item{cartSummary.qty > 1 ? 's' : ''}
                </span>
                <span className="font-display font-bold text-sm text-white tabular-nums">
                  ₹{cartSummary.total}{' '}
                  <span className="text-[11px] opacity-80 font-normal">plus taxes</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white text-secondary font-display font-bold text-xs px-3.5 py-2 rounded-xl shrink-0">
              <span>View Cart</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
