import React, { useMemo, useState } from 'react';
import type {
  AppScreen,
  CartItem,
  Coupon,
  MenuItem,
  Restaurant,
  SavedAddress,
} from '../types';
import { COUPONS, CROSS_SELL_ITEMS } from '../data/catalog';
import { FoodImage } from './FoodImage';
import { VegBadge } from './VegBadge';

interface CartCheckoutViewProps {
  cart: CartItem[];
  activeRestaurant: Restaurant | null;
  selectedAddress: SavedAddress;
  appliedCoupon: string | null;
  onApplyCoupon: (code: string | null) => void;
  onUpdateCartItemQty: (cartKey: string, delta: number) => void;
  onAddCrossSellItem: (item: MenuItem) => void;
  onOpenAddressModal: () => void;
  onPlaceOrder: (payload: {
    tipAmount: number;
    paymentMethod: string;
    deliveryInstructions: string[];
    itemTotal: number;
    deliveryFee: number;
    platformFee: number;
    gstAndCharges: number;
    couponCode: string | null;
    couponDiscount: number;
    totalPaid: number;
    totalSavings: number;
  }) => Promise<void>;
  onNavigate: (screen: AppScreen) => void;
  onOpenRestaurant: (restaurantId: string) => void;
  onShowToast: (msg: string) => void;
}

const INSTRUCTION_OPTIONS = [
  { id: 'Avoid calling', icon: 'phone_disabled', label: 'Avoid calling' },
  { id: 'Leave at door', icon: 'door_front', label: 'Leave at door' },
  { id: 'With security', icon: 'shield_person', label: 'With security' },
  { id: 'Pet at home', icon: 'pets', label: 'Pet at home' },
];

const PAYMENT_METHODS = [
  { id: 'Google Pay', label: 'Google Pay UPI', subtitle: 'Instant zero-fee UPI' },
  { id: 'CRED Pay UPI', label: 'CRED Pay UPI', subtitle: 'Eligible for cashback offers' },
  { id: 'Card', label: 'Credit / Debit Card', subtitle: 'Visa, Mastercard, RuPay' },
  { id: 'Cash on Delivery', label: 'Pay on Delivery', subtitle: 'Cash or UPI QR at doorstep' },
];

export const CartCheckoutView: React.FC<CartCheckoutViewProps> = ({
  cart,
  activeRestaurant,
  selectedAddress,
  appliedCoupon,
  onApplyCoupon,
  onUpdateCartItemQty,
  onAddCrossSellItem,
  onOpenAddressModal,
  onPlaceOrder,
  onNavigate,
  onOpenRestaurant,
  onShowToast,
}) => {
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([
    'Leave at door',
  ]);
  const [tipAmount, setTipAmount] = useState<number>(30);
  const [isCustomTipOpen, setIsCustomTipOpen] = useState(false);
  const [customTipText, setCustomTipText] = useState('40');
  const [paymentMethod, setPaymentMethod] = useState('Google Pay');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [customCouponInput, setCustomCouponInput] = useState('');
  const [showGstInfo, setShowGstInfo] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const isInstamartCart = cart[0]?.source === 'instamart';

  const bill = useMemo(() => {
    const itemTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    const standardDeliveryFee = 35;
    const isFreeDelivery = itemTotal >= 149;
    const deliveryFee = itemTotal === 0 ? 0 : isFreeDelivery ? 0 : standardDeliveryFee;
    const platformFee = itemTotal === 0 ? 0 : 6;
    const gstAndCharges = itemTotal === 0 ? 0 : Number((itemTotal * 0.05 + 11).toFixed(2));

    let couponDiscount = 0;
    const matchedCoupon: Coupon | undefined = COUPONS.find((c) => c.code === appliedCoupon);
    if (matchedCoupon && itemTotal >= matchedCoupon.minOrder) {
      if (matchedCoupon.discountType === 'percentage') {
        couponDiscount = Math.min(
          matchedCoupon.maxDiscount,
          Math.round((itemTotal * matchedCoupon.value) / 100),
        );
      } else if (matchedCoupon.discountType === 'flat') {
        couponDiscount = matchedCoupon.value;
      }
    }

    const totalPaid = Math.max(
      0,
      Number(
        (
          itemTotal +
          deliveryFee +
          platformFee +
          gstAndCharges +
          tipAmount -
          couponDiscount
        ).toFixed(2),
      ),
    );

    const deliverySaved = isFreeDelivery && itemTotal > 0 ? standardDeliveryFee : 0;
    const totalSavings = Number((deliverySaved + couponDiscount).toFixed(2));
    const strikeTotal = Number((totalPaid + totalSavings).toFixed(2));

    return {
      itemTotal,
      standardDeliveryFee,
      isFreeDelivery,
      deliveryFee,
      platformFee,
      gstAndCharges,
      couponDiscount,
      matchedCoupon,
      totalPaid,
      totalSavings,
      strikeTotal,
    };
  }, [cart, appliedCoupon, tipAmount]);

  const toggleInstruction = (label: string) => {
    setSelectedInstructions((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      await onPlaceOrder({
        tipAmount,
        paymentMethod,
        deliveryInstructions: selectedInstructions,
        itemTotal: bill.itemTotal,
        deliveryFee: bill.deliveryFee,
        platformFee: bill.platformFee,
        gstAndCharges: bill.gstAndCharges,
        couponCode: bill.couponDiscount > 0 ? appliedCoupon : null,
        couponDiscount: bill.couponDiscount,
        totalPaid: bill.totalPaid,
        totalSavings: bill.totalSavings,
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleApplyManualCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = customCouponInput.trim().toUpperCase();
    if (!code) return;
    const found = COUPONS.find((c) => c.code === code);
    if (!found) {
      onShowToast(`Coupon "${code}" is invalid or expired`);
      return;
    }
    if (bill.itemTotal < found.minOrder) {
      onShowToast(`Add ₹${found.minOrder - bill.itemTotal} more to unlock ${code}`);
      return;
    }
    onApplyCoupon(code);
    setCustomCouponInput('');
    setShowCouponModal(false);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-primary-fixed/60 text-primary mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px]">local_mall</span>
        </div>
        <h2 className="font-display font-extrabold text-2xl text-on-surface">
          Your cart feels light
        </h2>
        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
          Explore hot biryanis from Meghana Foods, smash burgers from Truffles, or 10-minute
          groceries on Instamart.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="px-6 py-3 rounded-xl bg-primary-container text-on-primary font-display font-bold text-sm shadow-sm hover:opacity-95"
          >
            Browse Restaurants
          </button>
          <button
            type="button"
            onClick={() => onNavigate('instamart')}
            className="px-6 py-3 rounded-xl bg-surface-container-lowest border border-surface-variant text-on-surface font-display font-bold text-sm hover:bg-surface-container-low"
          >
            Shop Instamart (10m)
          </button>
        </div>
      </div>
    );
  }

  const cartItemIds = new Set(cart.map((c) => c.itemId));

  return (
    <div className="max-w-7xl mx-auto w-full pb-36 lg:pb-16">
      {/* Top Savings Banner */}
      {bill.totalSavings > 0 && (
        <div className="px-4 lg:px-6 pt-3">
          <div className="flex items-center justify-between bg-primary-fixed/65 px-4 py-2.5 rounded-xl">
            <p className="text-xs sm:text-sm text-on-primary-fixed font-semibold tabular-nums">
              You saved ₹{bill.totalSavings.toFixed(0)} on this order with free delivery & offers
            </p>
            <span className="text-[11px] text-primary font-bold uppercase tracking-wider shrink-0">
              Swiggy One
            </span>
          </div>
        </div>
      )}

      <div className="px-4 lg:px-6 pt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Restaurant Context, Cart Items, Cross-Sell, Instructions, Address */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Source Context Header */}
          <section className="bg-surface-container-lowest p-4 rounded-2xl shadow-xs border border-surface-container-high flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-surface-container">
              <FoodImage
                src={
                  isInstamartCart
                    ? cart[0].image
                    : activeRestaurant?.thumbImage || cart[0].image
                }
                alt={cart[0].restaurantName}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display font-bold text-base text-on-surface truncate">
                  {cart[0].restaurantName}
                </h2>
                <span className="material-symbols-outlined material-symbols-filled text-[16px] text-secondary">
                  verified
                </span>
              </div>
              <p className="text-xs text-on-surface-variant truncate mt-0.5">
                {isInstamartCart
                  ? 'Dark Store · Indiranagar Hub'
                  : `${activeRestaurant?.locality || 'Indiranagar'}, Bengaluru`}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-on-surface-variant tabular-nums">
                <span className="font-semibold text-on-surface">
                  {isInstamartCart ? '10 mins' : `${selectedAddress.deliveryMins} mins`}
                </span>
                <span aria-hidden="true">·</span>
                <span>Delivering to {selectedAddress.label}</span>
              </div>
            </div>
          </section>

          {/* Cart Items List */}
          <section className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-high flex flex-col gap-4">
            {cart.map((item, index) => (
              <React.Fragment key={item.cartKey}>
                {index > 0 && <div className="h-px bg-surface-container-high w-full" />}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="mt-1">
                      <VegBadge diet={item.diet} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-on-surface truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5 tabular-nums">
                        ₹{item.unitPrice} × {item.qty} ={' '}
                        <span className="font-bold text-on-surface">
                          ₹{item.unitPrice * item.qty}
                        </span>
                      </p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          {item.selectedOptions.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-surface-container-low rounded-lg px-1 py-0.5 shadow-2xs shrink-0 tabular-nums">
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() => onUpdateCartItemQty(item.cartKey, -1)}
                      className="w-8 h-8 flex items-center justify-center text-primary-container font-bold text-base active:scale-90 transition-transform"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-on-surface">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => onUpdateCartItemQty(item.cartKey, 1)}
                      className="w-8 h-8 flex items-center justify-center text-primary-container font-bold text-base active:scale-90 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {/* Add More Items CTA */}
            <button
              type="button"
              onClick={() =>
                isInstamartCart
                  ? onNavigate('instamart')
                  : onOpenRestaurant(cart[0].restaurantId)
              }
              className="flex items-center justify-center gap-1.5 py-2.5 bg-surface-container-low rounded-xl text-primary hover:bg-surface-container transition-colors text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add more items from {cart[0].restaurantName}</span>
            </button>
          </section>

          {/* Complete Your Meal Cross-Sell */}
          {!isInstamartCart && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-display font-bold text-sm sm:text-base text-on-surface">
                  Complete your meal
                </h3>
                <span className="text-xs text-on-surface-variant">Pairs well with your order</span>
              </div>

              <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
                {CROSS_SELL_ITEMS.map((cs) => {
                  const alreadyInCart = cartItemIds.has(cs.id);
                  return (
                    <div
                      key={cs.id}
                      className="min-w-[152px] max-w-[152px] bg-surface-container-lowest rounded-2xl p-2.5 shadow-xs border border-surface-container-high flex flex-col justify-between shrink-0"
                    >
                      <div className="w-full h-22 rounded-xl overflow-hidden bg-surface-container mb-2 relative">
                        <FoodImage src={cs.image} alt={cs.name} />
                        <div className="absolute top-1.5 left-1.5">
                          <VegBadge diet={cs.diet} size="sm" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">{cs.name}</p>
                        <p className="text-xs text-on-surface-variant font-medium tabular-nums">
                          ₹{cs.price}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddCrossSellItem(cs)}
                        className={`mt-2 w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                          alreadyInCart
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-container-low text-secondary hover:bg-secondary hover:text-on-secondary'
                        }`}
                      >
                        {alreadyInCart ? (
                          <>
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Add +1</span>
                          </>
                        ) : (
                          <span>+ ADD</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Delivery Instructions */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high">
            <h3 className="font-display font-bold text-base text-on-surface mb-0.5">
              Delivery instructions
            </h3>
            <p className="text-xs text-on-surface-variant mb-3">
              Help delivery partner reach you quickly and safely
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INSTRUCTION_OPTIONS.map((inst) => {
                const isSelected = selectedInstructions.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => toggleInstruction(inst.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[19px] ${
                        isSelected ? 'text-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      {inst.icon}
                    </span>
                    <span className="text-xs leading-tight">{inst.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Delivery Address Confirmation Card */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[19px]">
                  {selectedAddress.label === 'Work' ? 'work' : 'home'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm text-on-surface font-bold">
                    Deliver to {selectedAddress.label}
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    check_circle
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant truncate mt-0.5">
                  {selectedAddress.fullAddress}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAddressModal}
              className="text-xs font-bold text-primary hover:underline shrink-0 px-2 py-1"
            >
              Change
            </button>
          </section>
        </div>

        {/* Right Column: Coupons, Tip, Bill Breakdown, Payment Method & Pay CTA */}
        <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-24">
          {/* Coupons & Offers Card */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary-container/40 flex items-center justify-center shrink-0 text-secondary">
                  <span className="material-symbols-outlined text-[19px]">sell</span>
                </div>
                <div className="min-w-0">
                  {appliedCoupon && bill.couponDiscount > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-on-surface">{appliedCoupon}</span>
                        <span className="text-[10px] font-bold text-secondary uppercase">
                          Applied
                        </span>
                      </div>
                      <p className="text-xs text-secondary font-medium mt-0.5 tabular-nums">
                        You saved ₹{bill.couponDiscount} with this coupon
                      </p>
                    </>
                  ) : appliedCoupon && bill.matchedCoupon ? (
                    <>
                      <span className="text-sm font-bold text-on-surface">{appliedCoupon}</span>
                      <p className="text-xs text-tertiary mt-0.5 tabular-nums">
                        Add ₹{bill.matchedCoupon.minOrder - bill.itemTotal} more to unlock this
                        coupon
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-bold text-on-surface">Apply Coupon</span>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Unlock up to ₹150 instant savings
                      </p>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCouponModal(true)}
                className="text-xs font-bold text-primary-container hover:underline px-2 py-1 shrink-0"
              >
                {appliedCoupon ? 'Change' : 'View All'}
              </button>
            </div>
          </section>

          {/* Delivery Partner Tip */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high">
            <h3 className="font-display font-bold text-base text-on-surface">
              Tip your delivery partner
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              100% of the tip goes directly to your delivery partner
            </p>

            <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar tabular-nums">
              {[20, 30, 50].map((amt) => {
                const isSelected = !isCustomTipOpen && tipAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setIsCustomTipOpen(false);
                      setTipAmount((curr) => (curr === amt ? 0 : amt));
                    }}
                    className={`min-w-[64px] py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-primary-container text-on-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    ₹{amt} {amt === 30 ? '· Popular' : ''}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setIsCustomTipOpen((v) => !v);
                  if (!isCustomTipOpen) {
                    setTipAmount(Number(customTipText) || 0);
                  }
                }}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-colors ${
                  isCustomTipOpen
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Custom
              </button>
            </div>

            {isCustomTipOpen && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm font-bold text-on-surface">₹</span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={customTipText}
                  onChange={(e) => {
                    setCustomTipText(e.target.value);
                    const val = Math.max(0, Math.min(500, Number(e.target.value) || 0));
                    setTipAmount(val);
                  }}
                  className="w-28 px-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-variant text-sm font-bold tabular-nums outline-none"
                />
                <span className="text-xs text-on-surface-variant">Max ₹500</span>
              </div>
            )}
          </section>

          {/* Payment Method Selector */}
          <section className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high space-y-2.5">
            <h3 className="font-display font-bold text-base text-on-surface">Payment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const active = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-primary-container bg-primary-fixed/30'
                        : 'border-surface-container-high bg-surface-container-low/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-on-surface">{pm.label}</p>
                      <p className="text-[11px] text-on-surface-variant">{pm.subtitle}</p>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        active ? 'text-primary-container material-symbols-filled' : 'text-outline'
                      }`}
                    >
                      {active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Bill Details Breakdown */}
          <section
            id="detailed-bill-card"
            className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-xs border border-surface-container-high flex flex-col gap-2.5 tabular-nums"
          >
            <h3 className="font-display font-bold text-base text-on-surface mb-0.5">
              Bill Details
            </h3>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-on-surface-variant">Item Total</span>
              <span className="font-medium text-on-surface">₹{bill.itemTotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">Delivery Fee</span>
                {bill.isFreeDelivery && (
                  <span className="text-[10px] font-bold text-secondary uppercase">One Free</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {bill.isFreeDelivery ? (
                  <>
                    <span className="text-on-surface-variant line-through">
                      ₹{bill.standardDeliveryFee.toFixed(2)}
                    </span>
                    <span className="font-bold text-secondary">FREE</span>
                  </>
                ) : (
                  <span className="font-medium text-on-surface">
                    ₹{bill.deliveryFee.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-on-surface-variant">Delivery Partner Tip</span>
              <span className="font-medium text-on-surface">₹{tipAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-on-surface-variant">Platform fee</span>
              <span className="font-medium text-on-surface">₹{bill.platformFee.toFixed(2)}</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setShowGstInfo((v) => !v)}
                  className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
                >
                  <span>GST and Restaurant Charges</span>
                  <span className="material-symbols-outlined text-[15px]">info</span>
                </button>
                <span className="font-medium text-on-surface">
                  ₹{bill.gstAndCharges.toFixed(2)}
                </span>
              </div>
              {showGstInfo && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant flex justify-between">
                  <span>5% Restaurant GST + ₹11 Hygiene Packaging</span>
                  <span>₹{bill.gstAndCharges.toFixed(2)}</span>
                </div>
              )}
            </div>

            {bill.couponDiscount > 0 && (
              <div className="flex items-center justify-between text-xs sm:text-sm text-secondary">
                <span className="font-medium">Coupon Discount ({appliedCoupon})</span>
                <span className="font-bold">− ₹{bill.couponDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="h-px bg-surface-container-high my-1" />

            <div className="flex items-center justify-between">
              <div>
                <span className="font-display font-bold text-base text-on-surface">To Pay</span>
                {bill.totalSavings > 0 && (
                  <p className="text-xs text-secondary font-semibold">
                    Total Savings: ₹{bill.totalSavings.toFixed(2)}
                  </p>
                )}
              </div>
              <span className="font-display font-extrabold text-xl text-on-surface">
                ₹{bill.totalPaid.toFixed(2)}
              </span>
            </div>

            {/* Desktop Checkout Button */}
            <button
              type="button"
              disabled={isPlacingOrder}
              onClick={handleCheckout}
              className="hidden lg:flex mt-3 w-full bg-primary-container text-on-primary py-3.5 px-6 rounded-xl font-display font-bold text-sm items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-98 transition-all disabled:opacity-60"
            >
              {isPlacingOrder ? (
                <span>SECURING YOUR ORDER...</span>
              ) : (
                <>
                  <span>PAY ₹{bill.totalPaid.toFixed(2)} · PLACE ORDER</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </section>
        </div>
      </div>

      {/* Mobile Sticky Bottom Checkout Dock */}
      <aside className="lg:hidden fixed bottom-16 inset-x-0 z-30 bg-surface-container-lowest border-t border-surface-container-high shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0 tabular-nums">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-extrabold text-lg text-on-surface leading-none">
                ₹{bill.totalPaid.toFixed(2)}
              </span>
              {bill.totalSavings > 0 && (
                <span className="text-[11px] text-on-surface-variant line-through">
                  ₹{bill.strikeTotal.toFixed(2)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                document
                  .getElementById('detailed-bill-card')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-[11px] text-primary font-bold flex items-center gap-0.5 mt-0.5 text-left"
            >
              <span>VIEW DETAILED BILL</span>
              <span className="material-symbols-outlined text-[14px]">expand_less</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isPlacingOrder}
            onClick={handleCheckout}
            className="bg-primary-container text-on-primary text-xs sm:text-sm px-5 py-3.5 rounded-xl font-display font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all shrink-0 disabled:opacity-60"
          >
            <span>{isPlacingOrder ? 'PLACING ORDER...' : 'PROCEED TO PAY'}</span>
            <span className="material-symbols-outlined text-[19px]">arrow_forward</span>
          </button>
        </div>
      </aside>

      {/* Coupon Selection Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <h3 className="font-display font-bold text-lg text-on-surface">
                Coupons & Bank Offers
              </h3>
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyManualCoupon} className="flex gap-2">
              <input
                type="text"
                value={customCouponInput}
                onChange={(e) => setCustomCouponInput(e.target.value)}
                placeholder="Enter coupon code (e.g. WELCOME50)"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-variant text-xs font-semibold uppercase outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-inverse-surface text-inverse-on-surface text-xs font-bold"
              >
                APPLY
              </button>
            </form>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {COUPONS.map((c) => {
                const eligible = bill.itemTotal >= c.minOrder;
                const isCurrent = appliedCoupon === c.code;
                return (
                  <div
                    key={c.code}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                      isCurrent
                        ? 'border-secondary bg-secondary-container/20'
                        : 'border-surface-container-high bg-surface-container-low/50'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="inline-block font-display font-extrabold text-xs tracking-wider text-primary bg-primary-fixed px-2 py-0.5 rounded">
                        {c.code}
                      </span>
                      <p className="text-xs font-bold text-on-surface pt-1">{c.title}</p>
                      <p className="text-[11px] text-on-surface-variant">{c.description}</p>
                      {!eligible && (
                        <p className="text-[11px] text-tertiary font-semibold tabular-nums">
                          Add ₹{c.minOrder - bill.itemTotal} more to apply
                        </p>
                      )}
                    </div>

                    {isCurrent ? (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyCoupon(null);
                          setShowCouponModal(false);
                        }}
                        className="text-xs font-bold text-tertiary px-2.5 py-1.5"
                      >
                        REMOVE
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!eligible}
                        onClick={() => {
                          onApplyCoupon(c.code);
                          setShowCouponModal(false);
                        }}
                        className="text-xs font-bold text-secondary disabled:text-outline px-2.5 py-1.5"
                      >
                        APPLY
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
