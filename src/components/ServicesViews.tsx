import React, { useMemo, useState } from 'react';
import type {
  AppScreen,
  CartItem,
  DineoutBooking,
  DineoutVenue,
  GenieBooking,
  InstamartProduct,
  MenuItem,
  OrderRating,
  OrderRecord,
  Restaurant,
  SavedAddress,
} from '../types';
import { BRAND_ASSETS, DINEOUT_VENUES, INSTAMART_PRODUCTS } from '../data/catalog';
import { FoodImage } from './FoodImage';
import { VegBadge } from './VegBadge';

/* ---------------------- INSTAMART 10-MIN GROCERY VIEW ---------------------- */
interface InstamartViewProps {
  cart: CartItem[];
  onAddInstamartItem: (product: InstamartProduct) => void;
  onUpdateInstamartQty: (productId: string, delta: number) => void;
  onNavigate: (screen: AppScreen) => void;
}

export const InstamartView: React.FC<InstamartViewProps> = ({
  cart,
  onAddInstamartItem,
  onUpdateInstamartQty,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(INSTAMART_PRODUCTS.map((p) => p.category)))],
    [],
  );

  const qtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cart) {
      if (c.source === 'instamart') {
        map[c.itemId] = (map[c.itemId] || 0) + c.qty;
      }
    }
    return map;
  }, [cart]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTAMART_PRODUCTS.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [selectedCategory, query]);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 pt-4 pb-28 lg:pb-16 space-y-5">
      {/* Express 10-Min Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#135200] via-[#1d6d00] to-[#237406] text-on-secondary p-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-fixed">
            Indiranagar Dark Store · 0.9 km
          </span>
          <h2 className="font-display font-extrabold text-2xl text-white">
            Groceries in 10 Minutes
          </h2>
          <p className="text-xs text-white/85">
            Farm-fresh produce, chilled beverages, dairy & bakery essentials delivered lightning-fast.
          </p>
        </div>
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 p-2 shrink-0 overflow-hidden">
          <FoodImage
            src={BRAND_ASSETS.serviceInstamart}
            alt="Instamart Express"
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high px-3.5 h-11 flex items-center gap-2 flex-1 max-w-md">
          <span className="material-symbols-outlined text-[20px] text-outline">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search milk, avocados, coke zero, bread..."
            className="bg-transparent flex-1 text-sm outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-secondary text-on-secondary font-bold'
                  : 'bg-surface-container-lowest border border-surface-variant text-on-surface'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((prod) => {
          const qty = qtyMap[prod.id] || 0;
          const discountPct = Math.round(((prod.mrp - prod.price) / prod.mrp) * 100);

          return (
            <div
              key={prod.id}
              className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container-high flex flex-col justify-between"
            >
              <div>
                <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-surface-container-low mb-2.5">
                  <FoodImage src={prod.image} alt={prod.name} />
                  {discountPct > 0 && (
                    <span className="absolute top-2 left-2 bg-secondary text-on-secondary text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant">{prod.weight}</p>
                <h3 className="font-display font-bold text-sm text-on-surface line-clamp-2 mt-0.5">
                  {prod.name}
                </h3>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 tabular-nums">
                <div>
                  <span className="font-display font-extrabold text-sm text-on-surface">
                    ₹{prod.price}
                  </span>
                  <span className="text-[11px] text-on-surface-variant line-through ml-1">
                    ₹{prod.mrp}
                  </span>
                </div>

                {qty > 0 ? (
                  <div className="flex items-center bg-secondary text-on-secondary rounded-lg h-8 px-1.5 font-bold text-xs">
                    <button
                      type="button"
                      onClick={() => onUpdateInstamartQty(prod.id, -1)}
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-5 text-center">{qty}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateInstamartQty(prod.id, 1)}
                      className="w-6 h-6 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddInstamartItem(prod)}
                    className="px-3.5 h-8 rounded-lg bg-surface-container-low hover:bg-secondary hover:text-on-secondary text-secondary text-xs font-extrabold transition-colors"
                  >
                    + ADD
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-18 lg:bottom-6 inset-x-4 max-w-lg mx-auto z-30">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="w-full bg-secondary text-on-secondary rounded-2xl h-14 px-4 shadow-xl flex items-center justify-between font-display font-bold text-sm tabular-nums"
          >
            <span>
              {totalItems} item{totalItems > 1 ? 's' : ''} · ₹{totalAmount}
            </span>
            <span className="flex items-center gap-1">
              Proceed to 10m Checkout
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------------------- DINEOUT TABLE RESERVATIONS VIEW ---------------------- */
interface DineoutViewProps {
  bookings: DineoutBooking[];
  onBookTable: (payload: {
    venue: DineoutVenue;
    dateLabel: string;
    timeSlot: string;
    guests: number;
  }) => Promise<void>;
}

export const DineoutView: React.FC<DineoutViewProps> = ({ bookings, onBookTable }) => {
  const [selectedVenue, setSelectedVenue] = useState<DineoutVenue | null>(null);
  const [guests, setGuests] = useState(2);
  const [dateLabel, setDateLabel] = useState('Tonight');
  const [timeSlot, setTimeSlot] = useState('8:00 PM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedVenue || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onBookTable({ venue: selectedVenue, dateLabel, timeSlot, guests });
      setSelectedVenue(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 pt-4 pb-28 lg:pb-16 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#410004] via-[#78000e] to-[#b81e26] text-white p-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary-fixed">
            Swiggy Dineout · Bengaluru
          </span>
          <h2 className="font-display font-extrabold text-2xl">
            Up to 30% OFF Dining Bills
          </h2>
          <p className="text-xs text-white/85">
            Reserve guaranteed tables at Indiranagar’s top restaurants with zero booking fees.
          </p>
        </div>
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 hidden sm:block">
          <FoodImage src={BRAND_ASSETS.serviceDineout} alt="Dineout" />
        </div>
      </div>

      {/* Confirmed Reservations */}
      {bookings.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="font-display font-bold text-base text-on-surface">
            Your Confirmed Table Reservations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="bg-surface-container-lowest p-4 rounded-2xl border border-secondary/40 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      event_available
                    </span>
                    <span className="font-display font-bold text-sm text-on-surface">
                      {b.venueName}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 tabular-nums">
                    {b.dateLabel} at {b.timeSlot} · {b.guests} Guests · {b.discountOffer}
                  </p>
                </div>
                <span className="text-xs font-bold text-secondary tabular-nums shrink-0">
                  #{b.confirmationCode}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {DINEOUT_VENUES.map((v) => (
          <div
            key={v.id}
            className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs border border-surface-container-high flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 w-full">
                <FoodImage src={v.image} alt={v.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 text-xs font-bold text-white">
                  {v.discountOffer}
                </span>
              </div>
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base text-on-surface truncate">
                    {v.name}
                  </h3>
                  <span className="text-xs font-bold text-secondary tabular-nums">
                    ★ {v.rating}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">{v.cuisines}</p>
                <p className="text-xs text-on-surface-variant tabular-nums">
                  {v.locality} · {v.distanceKm} km · {v.costForTwo}
                </p>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2.5">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {v.nextSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      setSelectedVenue(v);
                      setTimeSlot(slot);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-primary-fixed text-xs font-semibold text-on-surface whitespace-nowrap tabular-nums"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVenue(v);
                  setTimeSlot(v.nextSlots[0]);
                }}
                className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary font-display font-bold text-xs"
              >
                Reserve Table & Unlock Offer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reservation Modal */}
      {selectedVenue && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-on-surface">
                  Book Table · {selectedVenue.name}
                </h3>
                <p className="text-xs text-secondary font-semibold">
                  {selectedVenue.discountOffer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVenue(null)}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-on-surface mb-1.5">Select Day</p>
                <div className="flex gap-2">
                  {['Tonight', 'Tomorrow', 'This Weekend'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDateLabel(d)}
                      className={`flex-1 py-2 rounded-xl font-bold ${
                        dateLabel === d
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-on-surface mb-1.5">Number of Guests</p>
                <div className="flex gap-2 tabular-nums">
                  {[2, 4, 6, 8].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGuests(g)}
                      className={`flex-1 py-2 rounded-xl font-bold ${
                        guests === g
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      {g} Guests
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-bold text-on-surface mb-1.5">Time Slot</p>
                <div className="flex flex-wrap gap-2 tabular-nums">
                  {selectedVenue.nextSlots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTimeSlot(s)}
                      className={`px-3.5 py-2 rounded-xl font-bold ${
                        timeSlot === s
                          ? 'bg-primary-container text-on-primary'
                          : 'bg-surface-container-low text-on-surface'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-secondary text-on-secondary font-display font-bold text-sm"
            >
              {isSubmitting ? 'Confirming Table...' : 'Confirm Instant Reservation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------------- SWIGGY GENIE PARCEL PICK & DROP VIEW ---------------------- */
interface GenieViewProps {
  bookings: GenieBooking[];
  selectedAddress: SavedAddress;
  onBookGenie: (payload: {
    pickupAddress: string;
    dropAddress: string;
    packageType: string;
    distanceKm: number;
    estimatedFare: number;
  }) => Promise<void>;
}

export const GenieView: React.FC<GenieViewProps> = ({
  bookings,
  selectedAddress,
  onBookGenie,
}) => {
  const [pickupAddress, setPickupAddress] = useState(selectedAddress.fullAddress);
  const [dropAddress, setDropAddress] = useState(
    'Tower B Reception, Embassy GolfLinks, Domlur, Bengaluru',
  );
  const [packageType, setPackageType] = useState('Documents & Keys');
  const [distanceKm, setDistanceKm] = useState(3.8);
  const [submitting, setSubmitting] = useState(false);

  const estimatedFare = Math.round(35 + distanceKm * 12);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupAddress.trim() || !dropAddress.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onBookGenie({
        pickupAddress,
        dropAddress,
        packageType,
        distanceKm,
        estimatedFare,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 lg:px-6 pt-4 pb-28 lg:pb-16 space-y-5">
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high flex items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-container">
            Instant City Courier
          </span>
          <h2 className="font-display font-extrabold text-2xl text-on-surface">
            Swiggy Genie · Pick & Drop Anything
          </h2>
          <p className="text-xs text-on-surface-variant">
            Forgotten keys, home-cooked lunchboxes, chargers, or urgent documents across Bengaluru.
          </p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 p-2 shrink-0">
          <FoodImage src={BRAND_ASSETS.serviceGenie} alt="Genie" />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-surface-container-high space-y-4"
      >
        <div>
          <label className="block text-xs font-bold text-on-surface mb-1">Pickup Address</label>
          <input
            type="text"
            required
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-variant text-xs outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface mb-1">Drop-off Address</label>
          <input
            type="text"
            required
            value={dropAddress}
            onChange={(e) => setDropAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-variant text-xs outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              Package Contents
            </label>
            <div className="flex flex-wrap gap-2">
              {['Documents & Keys', 'Home Tiffin / Food', 'Electronics', 'Clothes'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPackageType(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    packageType === t
                      ? 'bg-primary-container text-on-primary font-bold'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5 tabular-nums">
              Estimated Route Distance: {distanceKm} km
            </label>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full accent-primary-container"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-surface-container-high flex items-center justify-between">
          <div className="tabular-nums">
            <p className="text-xs text-on-surface-variant">Instant Genie Fare</p>
            <p className="font-display font-extrabold text-xl text-on-surface">₹{estimatedFare}</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-primary-container text-on-primary font-display font-bold text-xs sm:text-sm"
          >
            {submitting ? 'Assigning Rider...' : 'Book Genie Partner'}
          </button>
        </div>
      </form>

      {bookings.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="font-display font-bold text-base text-on-surface">
            Active Genie Dispatches
          </h3>
          {bookings.map((g) => (
            <div
              key={g.id}
              className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-high space-y-1 tabular-nums"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary">{g.status}</span>
                <span className="text-xs font-bold text-on-surface">₹{g.estimatedFare}</span>
              </div>
              <p className="text-xs text-on-surface">
                <span className="font-semibold">Package:</span> {g.packageType} ({g.distanceKm} km)
              </p>
              <p className="text-[11px] text-on-surface-variant truncate">
                {g.pickupAddress} → {g.dropAddress}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

/* ---------------------- DISH CUSTOMIZATION MODAL ---------------------- */
interface DishCustomizationModalProps {
  restaurant: Restaurant;
  dish: MenuItem;
  onClose: () => void;
  onConfirmAdd: (selectedOptions: string[], unitPrice: number) => void;
}

export const DishCustomizationModal: React.FC<DishCustomizationModalProps> = ({
  dish,
  onClose,
  onConfirmAdd,
}) => {
  const groups = dish.customizationGroups || [];
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const g of groups) {
      if (g.required && g.choices[0]) {
        initial[g.id] = [g.choices[0].id];
      } else if (g.id === 'addons' && g.choices[0]?.priceDelta === 0) {
        initial[g.id] = [g.choices[0].id];
      } else {
        initial[g.id] = [];
      }
    }
    return initial;
  });

  const computed = useMemo(() => {
    let extra = 0;
    const labels: string[] = [];
    for (const g of groups) {
      const picked = selections[g.id] || [];
      for (const cid of picked) {
        const c = g.choices.find((ch) => ch.id === cid);
        if (c) {
          extra += c.priceDelta;
          labels.push(c.label);
        }
      }
    }
    return { unitPrice: dish.price + extra, labels };
  }, [dish.price, groups, selections]);

  const toggleChoice = (groupId: string, choiceId: string, multi: boolean) => {
    setSelections((prev) => {
      const curr = prev[groupId] || [];
      if (!multi) {
        return { ...prev, [groupId]: [choiceId] };
      }
      return {
        ...prev,
        [groupId]: curr.includes(choiceId)
          ? curr.filter((x) => x !== choiceId)
          : [...curr, choiceId],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-surface-container-high pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
              <FoodImage src={dish.image} alt={dish.name} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <VegBadge diet={dish.diet} size="sm" />
                <h3 className="font-display font-bold text-sm sm:text-base text-on-surface truncate">
                  {dish.name}
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant tabular-nums">Base ₹{dish.price}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {groups.map((g) => (
            <div key={g.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-xs sm:text-sm text-on-surface">
                  {g.title}
                </h4>
                <span className="text-[11px] text-on-surface-variant">
                  {g.required ? 'Required · Pick 1' : 'Optional'}
                </span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-2 space-y-1">
                {g.choices.map((ch) => {
                  const checked = (selections[g.id] || []).includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChoice(g.id, ch.id, g.multiSelect)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-lowest/70 text-left text-xs tabular-nums"
                    >
                      <span className="font-medium text-on-surface">{ch.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant">
                          {ch.priceDelta > 0 ? `+ ₹${ch.priceDelta}` : 'Free'}
                        </span>
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            checked
                              ? 'text-secondary material-symbols-filled'
                              : 'text-outline'
                          }`}
                        >
                          {g.multiSelect
                            ? checked
                              ? 'check_box'
                              : 'check_box_outline_blank'
                            : checked
                              ? 'radio_button_checked'
                              : 'radio_button_unchecked'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onConfirmAdd(computed.labels, computed.unitPrice)}
          className="w-full py-3.5 rounded-xl bg-secondary text-on-secondary font-display font-bold text-sm flex items-center justify-between px-5 tabular-nums"
        >
          <span>Item Total · ₹{computed.unitPrice}</span>
          <span>ADD ITEM TO CART</span>
        </button>
      </div>
    </div>
  );
};

/* ---------------------- ADDRESS PICKER & PROFILE ORDERS MODALS ---------------------- */
interface AddressModalProps {
  addresses: SavedAddress[];
  selectedAddressId: string;
  onSelectAddress: (id: string) => Promise<void>;
  onAddAddress: (payload: {
    label: 'Home' | 'Work' | 'Other';
    shortArea: string;
    fullAddress: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onClose,
}) => {
  const [addingNew, setAddingNew] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [shortArea, setShortArea] = useState('');
  const [fullAddress, setFullAddress] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortArea.trim() || !fullAddress.trim()) return;
    await onAddAddress({ label, shortArea, fullAddress });
    setAddingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
          <h3 className="font-display font-bold text-lg text-on-surface">
            Select Delivery Location
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {!addingNew ? (
          <>
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {addresses.map((addr) => {
                const isSelected = addr.id === selectedAddressId;
                return (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={async () => {
                      await onSelectAddress(addr.id);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'border-primary-container bg-primary-fixed/30'
                        : 'border-surface-container-high bg-surface-container-low/50 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary-container">
                          {addr.label === 'Work' ? 'work' : 'home'}
                        </span>
                        <span className="text-xs font-bold text-on-surface">{addr.label}</span>
                        <span className="text-[11px] text-on-surface-variant tabular-nums">
                          · {addr.deliveryMins} mins
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {addr.fullAddress}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="w-full py-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-display font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              <span>Add New Bengaluru Address</span>
            </button>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div className="flex gap-2">
              {(['Home', 'Work', 'Other'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`flex-1 py-2 rounded-xl font-bold ${
                    label === l
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={shortArea}
              onChange={(e) => setShortArea(e.target.value)}
              placeholder="Area / Street (e.g. 100ft Road, Indiranagar)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-variant outline-none"
            />
            <textarea
              required
              rows={2}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Flat / House No., Building, Landmark"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-variant outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddingNew(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-high font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold"
              >
                Save & Deliver Here
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const STAR_LABELS: Record<number, string> = {
  1: '1 · Poor',
  2: '2 · Subpar',
  3: '3 · Good',
  4: '4 · Very Good',
  5: '5 · Loved it!',
};

const RESTAURANT_FEEDBACK_TAGS = [
  'Authentic Taste',
  'Fresh & Hot',
  'Generous Portion',
  'Spill-Proof Packaging',
];

const RIDER_FEEDBACK_TAGS = [
  'On-Time Delivery',
  'Polite & Courteous',
  'Followed Instructions',
  'Safe Handling',
];

interface StarRatingInputProps {
  label: string;
  subtitle?: string;
  avatarUrl?: string;
  iconName?: string;
  value: number;
  onChange: (stars: number) => void;
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  label,
  subtitle,
  avatarUrl,
  iconName = 'storefront',
  value,
  onChange,
  tags,
  selectedTags,
  onToggleTag,
}) => {
  const [hovered, setHovered] = useState<number>(0);
  const displayStars = hovered || value;

  return (
    <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {avatarUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              <FoodImage src={avatarUrl} alt={label} fallbackIcon="two_wheeler" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">{iconName}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{label}</p>
            {subtitle && (
              <p className="text-[11px] text-on-surface-variant truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <span
          className={`text-[11px] font-bold tabular-nums shrink-0 ${
            displayStars >= 4
              ? 'text-secondary'
              : displayStars > 0
                ? 'text-primary'
                : 'text-on-surface-variant'
          }`}
        >
          {displayStars > 0 ? STAR_LABELS[displayStars] : 'Tap to rate'}
        </span>
      </div>

      {/* 5-Star Selector with >= 44px touch targets */}
      <div
        role="radiogroup"
        aria-label={`Rate ${label} out of 5 stars`}
        className="flex items-center justify-between sm:justify-start sm:gap-1.5"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= displayStars;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} ${star === 1 ? 'star' : 'stars'} for ${label}`}
              onMouseEnter={() => setHovered(star)}
              onClick={() => onChange(star)}
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center hover:bg-surface-container-low active:scale-90 transition-transform"
            >
              <span
                className={`material-symbols-outlined text-[26px] transition-colors ${
                  active
                    ? 'material-symbols-filled text-primary-container'
                    : 'text-outline-variant'
                }`}
              >
                star
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional Quick Feedback Tags */}
      {value > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((tag) => {
            const isPicked = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  isPicked
                    ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {isPicked ? `✓ ${tag}` : tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface DeliveredOrderRatingCardProps {
  order: OrderRecord;
  defaultExpanded: boolean;
  onRateOrder: (
    orderId: string,
    payload: Omit<OrderRating, 'submittedAt'>,
  ) => Promise<void>;
}

const DeliveredOrderRatingCard: React.FC<DeliveredOrderRatingCardProps> = ({
  order,
  defaultExpanded,
  onRateOrder,
}) => {
  const existing = order.rating;
  const [isEditing, setIsEditing] = useState<boolean>(!existing && defaultExpanded);
  const [restaurantStars, setRestaurantStars] = useState<number>(
    existing?.restaurantStars ?? 0,
  );
  const [riderStars, setRiderStars] = useState<number>(existing?.riderStars ?? 0);
  const [restaurantTags, setRestaurantTags] = useState<string[]>(
    existing?.restaurantTags ?? [],
  );
  const [riderTags, setRiderTags] = useState<string[]>(existing?.riderTags ?? []);
  const [comment, setComment] = useState<string>(existing?.comment ?? '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const toggleTag = (list: string[], setList: (v: string[]) => void, tag: string) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const canSubmit = restaurantStars >= 1 && riderStars >= 1 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onRateOrder(order.id, {
        restaurantStars,
        riderStars,
        restaurantTags,
        riderTags,
        comment,
      });
      setIsEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (existing && !isEditing) {
    return (
      <div className="pt-2 border-t border-surface-container-high space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            <span>Your Experience Rating</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setRestaurantStars(existing.restaurantStars);
              setRiderStars(existing.riderStars);
              setRestaurantTags(existing.restaurantTags);
              setRiderTags(existing.riderTags);
              setComment(existing.comment);
              setIsEditing(true);
            }}
            className="text-[11px] font-bold text-primary hover:underline px-1.5 py-0.5"
          >
            Edit Rating
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs tabular-nums">
          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-2">
            <span className="text-on-surface font-medium truncate">
              {order.restaurantName}
            </span>
            <span className="inline-flex items-center gap-0.5 text-primary-container font-bold shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`material-symbols-outlined text-[13px] ${
                    s <= existing.restaurantStars
                      ? 'material-symbols-filled text-primary-container'
                      : 'text-outline-variant'
                  }`}
                >
                  star
                </span>
              ))}
              <span className="ml-1 text-on-surface">{existing.restaurantStars}.0</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-2">
            <span className="text-on-surface font-medium truncate">
              {order.rider.name} (Rider)
            </span>
            <span className="inline-flex items-center gap-0.5 text-primary-container font-bold shrink-0">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`material-symbols-outlined text-[13px] ${
                    s <= existing.riderStars
                      ? 'material-symbols-filled text-primary-container'
                      : 'text-outline-variant'
                  }`}
                >
                  star
                </span>
              ))}
              <span className="ml-1 text-on-surface">{existing.riderStars}.0</span>
            </span>
          </div>
        </div>

        {(existing.restaurantTags.length > 0 || existing.riderTags.length > 0) && (
          <p className="text-[11px] text-on-surface-variant">
            Highlights: {[...existing.restaurantTags, ...existing.riderTags].join(' · ')}
          </p>
        )}

        {existing.comment && (
          <p className="text-xs text-on-surface italic bg-surface-container-lowest px-3 py-2 rounded-lg border border-surface-container-high">
            “{existing.comment}”
          </p>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div className="pt-2 border-t border-surface-container-high">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-primary-fixed/55 hover:bg-primary-fixed text-on-primary-fixed text-xs font-bold flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined material-symbols-filled text-[16px] text-primary-container">
              star
            </span>
            <span>Rate {order.restaurantName} & {order.rider.name}</span>
          </span>
          <span className="text-primary font-bold">Rate 1–5 ★</span>
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pt-2.5 border-t border-surface-container-high space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-xs text-on-surface">
          Rate Your Order Experience
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-[11px] font-semibold text-on-surface-variant hover:text-on-surface px-1.5 py-0.5"
        >
          Collapse
        </button>
      </div>

      {/* Restaurant 5-Star Rating */}
      <StarRatingInput
        label={order.restaurantName}
        subtitle="Food quality, taste & packaging"
        iconName="restaurant"
        value={restaurantStars}
        onChange={setRestaurantStars}
        tags={RESTAURANT_FEEDBACK_TAGS}
        selectedTags={restaurantTags}
        onToggleTag={(t) => toggleTag(restaurantTags, setRestaurantTags, t)}
      />

      {/* Delivery Partner 5-Star Rating */}
      <StarRatingInput
        label={order.rider.name}
        subtitle="Delivery speed, politeness & handling"
        avatarUrl={order.rider.avatar}
        value={riderStars}
        onChange={setRiderStars}
        tags={RIDER_FEEDBACK_TAGS}
        selectedTags={riderTags}
        onToggleTag={(t) => toggleTag(riderTags, setRiderTags, t)}
      />

      {/* Optional Written Review */}
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add an optional note about the dishes or delivery..."
        maxLength={300}
        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-high text-xs text-on-surface outline-none focus:border-primary-container"
      />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[11px] text-on-surface-variant">
          {restaurantStars === 0 || riderStars === 0
            ? 'Select stars for both restaurant & rider'
            : 'Ready to submit your feedback'}
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-display font-bold disabled:opacity-45 transition-opacity shrink-0"
        >
          {submitting
            ? 'Saving...'
            : existing
              ? 'Update Rating'
              : 'Submit Rating'}
        </button>
      </div>
    </form>
  );
};

interface ProfileOrdersModalProps {
  orders: OrderRecord[];
  favorites: string[];
  restaurants: Restaurant[];
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
  onReorder: (order: OrderRecord) => void;
  onRateOrder: (
    orderId: string,
    payload: Omit<OrderRating, 'submittedAt'>,
  ) => Promise<void>;
  onOpenRestaurant: (restaurantId: string) => void;
}

export const ProfileOrdersModal: React.FC<ProfileOrdersModalProps> = ({
  orders,
  favorites,
  restaurants,
  onClose,
  onTrackOrder,
  onReorder,
  onRateOrder,
  onOpenRestaurant,
}) => {
  const favRestaurants = restaurants.filter((r) => favorites.includes(r.id));
  const firstUnratedDeliveredId = useMemo(
    () => orders.find((o) => o.status === 'delivered' && !o.rating)?.id ?? null,
    [orders],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface-container-lowest w-full max-w-xl rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden">
              <FoodImage src={BRAND_ASSETS.profileAvatar} alt="Account" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-on-surface">
                Account & Order History
              </h3>
              <p className="text-xs text-primary font-semibold">
                Swiggy One Active · Unlimited Free Delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Order History"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Favorites */}
          <div className="space-y-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Saved Favorites ({favRestaurants.length})
            </h4>
            {favRestaurants.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                Tap the heart icon on any restaurant to save it here.
              </p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                {favRestaurants.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onOpenRestaurant(r.id);
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-left shrink-0"
                  >
                    <p className="text-xs font-bold text-on-surface">{r.name}</p>
                    <p className="text-[11px] text-on-surface-variant tabular-nums">
                      ★ {r.rating} · {r.deliveryMins} mins
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="space-y-3">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Recent Orders ({orders.length})
            </h4>
            {orders.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-container-low text-center">
                <p className="text-xs text-on-surface-variant">
                  No orders placed yet. Checkout your cart to see live GPS order tracking!
                </p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-high space-y-2.5 tabular-nums"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-sm text-on-surface">
                        {ord.restaurantName}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        #{ord.orderNumber} · ₹{ord.totalPaid.toFixed(2)} · Rider: {ord.rider.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        ord.status === 'delivered' ? 'text-secondary' : 'text-primary-container'
                      }`}
                    >
                      {ord.status === 'delivered'
                        ? 'Delivered'
                        : `In Transit (${ord.etaMinutes}m)`}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant truncate">
                    {ord.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                  </p>

                  <div className="flex gap-2 pt-0.5">
                    {ord.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() => {
                          onTrackOrder(ord.id);
                          onClose();
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold"
                      >
                        Live Track
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onReorder(ord);
                        onClose();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-surface-container-lowest border border-surface-variant text-on-surface text-xs font-bold hover:bg-surface-container-low"
                    >
                      Reorder Items
                    </button>
                  </div>

                  {/* 5-Star Rating Interface for Delivered Orders */}
                  {ord.status === 'delivered' && (
                    <DeliveredOrderRatingCard
                      order={ord}
                      defaultExpanded={ord.id === firstUnratedDeliveredId}
                      onRateOrder={onRateOrder}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
