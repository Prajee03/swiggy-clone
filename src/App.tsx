/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from './types';
import { DEFAULT_ADDRESSES, DISH_IMAGES, RESTAURANTS } from './data/catalog';
import { appApi } from './services/api';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { RestaurantDetailView } from './components/RestaurantDetailView';
import { CartCheckoutView } from './components/CartCheckoutView';
import { OrderTrackingView } from './components/OrderTrackingView';
import {
  AddressModal,
  DineoutView,
  DishCustomizationModal,
  GenieView,
  InstamartView,
  ProfileOrdersModal,
} from './components/ServicesViews';

const CART_STORAGE_KEY = 'swiggy_real_cart_v1';
const COUPON_STORAGE_KEY = 'swiggy_real_coupon_v1';

const INITIAL_STARTER_CART: CartItem[] = [
  {
    cartKey: 'meg-1::Regular Handi (Serves 1-2)|Authentic Andhra Medium-Spicy|Extra Raita included',
    itemId: 'meg-1',
    restaurantId: 'meghana-foods',
    restaurantName: 'Meghana Foods',
    name: 'Meghana Special Chicken Biryani',
    basePrice: 340,
    unitPrice: 340,
    qty: 1,
    diet: 'non-veg',
    image: DISH_IMAGES.meghanaChickenBiryani,
    selectedOptions: ['Extra Raita included'],
    source: 'food',
  },
  {
    cartKey: 'meg-3::default',
    itemId: 'meg-3',
    restaurantId: 'meghana-foods',
    restaurantName: 'Meghana Foods',
    name: 'Andhra Chilli Chicken',
    basePrice: 290,
    unitPrice: 290,
    qty: 1,
    diet: 'non-veg',
    image: DISH_IMAGES.andhraChilliChicken,
    selectedOptions: ["Chef's Bestseller"],
    source: 'food',
  },
];

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('meghana-foods');
  const [highlightDishId, setHighlightDishId] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<string[]>(['meghana-foods']);
  const [addresses, setAddresses] = useState<SavedAddress[]>(DEFAULT_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('addr-home');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [dineoutBookings, setDineoutBookings] = useState<DineoutBooking[]>([]);
  const [genieBookings, setGenieBookings] = useState<GenieBooking[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as CartItem[];
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_STARTER_CART;
  });

  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => {
    try {
      const saved = window.localStorage.getItem(COUPON_STORAGE_KEY);
      if (saved !== null) return saved || null;
    } catch {
      // ignore
    }
    return 'MEGHANA20';
  });

  const [customizingTarget, setCustomizingTarget] = useState<{
    restaurant: Restaurant;
    dish: MenuItem;
  } | null>(null);

  const [conflictModal, setConflictModal] = useState<{
    existingName: string;
    newName: string;
    onConfirmReplace: () => void;
  } | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COUPON_STORAGE_KEY, appliedCoupon || '');
    } catch {
      // ignore
    }
  }, [appliedCoupon]);

  // Bootstrap server or static state on load
  useEffect(() => {
    appApi.bootstrap().then((data) => {
      if (Array.isArray(data.favorites)) setFavorites(data.favorites);
      if (Array.isArray(data.addresses) && data.addresses.length > 0) {
        setAddresses(data.addresses);
      }
      if (data.selectedAddressId) setSelectedAddressId(data.selectedAddressId);
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        const inFlight = data.orders.find((o: OrderRecord) => o.status !== 'delivered');
        if (inFlight) setTrackedOrderId(inFlight.id);
        else if (data.orders[0]) setTrackedOrderId(data.orders[0].id);
      }
      if (Array.isArray(data.dineoutBookings)) setDineoutBookings(data.dineoutBookings);
      if (Array.isArray(data.genieBookings)) setGenieBookings(data.genieBookings);
    });
  }, []);

  const activeOrder = useMemo(() => {
    if (trackedOrderId) {
      return orders.find((o) => o.id === trackedOrderId) || orders[0] || null;
    }
    return orders.find((o) => o.status !== 'delivered') || orders[0] || null;
  }, [orders, trackedOrderId]);

  // Live poll active in-transit order every 5s
  useEffect(() => {
    if (!activeOrder || activeOrder.status === 'delivered') return;
    const timer = window.setInterval(async () => {
      const updated = await appApi.pollOrder(activeOrder.id);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeOrder]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || addresses[0] || DEFAULT_ADDRESSES[0],
    [addresses, selectedAddressId],
  );

  const selectedRestaurant = useMemo(
    () => RESTAURANTS.find((r) => r.id === selectedRestaurantId) || RESTAURANTS[0],
    [selectedRestaurantId],
  );

  const cartRestaurant = useMemo(() => {
    if (cart.length === 0 || cart[0].source === 'instamart') return null;
    return RESTAURANTS.find((r) => r.id === cart[0].restaurantId) || null;
  }, [cart]);

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.qty, 0), [cart]);

  const navigateTo = (next: AppScreen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRestaurant = (restaurantId: string, dishId?: string) => {
    setSelectedRestaurantId(restaurantId);
    setHighlightDishId(dishId || null);
    setScreen('restaurant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = async (restaurantId: string) => {
    const wasFav = favorites.includes(restaurantId);
    setFavorites((prev) =>
      wasFav ? prev.filter((id) => id !== restaurantId) : [...prev, restaurantId],
    );
    const rest = RESTAURANTS.find((r) => r.id === restaurantId);
    showToast(
      wasFav
        ? `Removed ${rest?.name || 'restaurant'} from favorites`
        : `Saved ${rest?.name || 'restaurant'} to favorites`,
    );

    const updatedFavs = await appApi.toggleFavorite(restaurantId);
    setFavorites(updatedFavs);
  };

  const commitItemToCart = (newItem: CartItem, replaceExisting = false) => {
    setCart((prev) => {
      const base = replaceExisting ? [] : prev;
      const existingIdx = base.findIndex((c) => c.cartKey === newItem.cartKey);
      if (existingIdx >= 0) {
        const copy = [...base];
        copy[existingIdx] = { ...copy[existingIdx], qty: copy[existingIdx].qty + newItem.qty };
        return copy;
      }
      return [...base, newItem];
    });
    showToast(`Added ${newItem.name} to cart`);
  };

  const addItemWithConflictCheck = (newItem: CartItem) => {
    if (cart.length > 0 && cart[0].restaurantId !== newItem.restaurantId) {
      setConflictModal({
        existingName: cart[0].restaurantName,
        newName: newItem.restaurantName,
        onConfirmReplace: () => {
          commitItemToCart(newItem, true);
          setConflictModal(null);
        },
      });
      return;
    }
    commitItemToCart(newItem, false);
  };

  const handleAddOrCustomizeDish = (restaurant: Restaurant, dish: MenuItem) => {
    if (dish.customizable && dish.customizationGroups && dish.customizationGroups.length > 0) {
      setCustomizingTarget({ restaurant, dish });
      return;
    }
    addItemWithConflictCheck({
      cartKey: `${dish.id}::default`,
      itemId: dish.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      name: dish.name,
      basePrice: dish.price,
      unitPrice: dish.price,
      qty: 1,
      diet: dish.diet,
      image: dish.image,
      selectedOptions: [],
      source: 'food',
    });
  };

  const handleUpdateDishQtyByDishId = (dishId: string, delta: number) => {
    setCart((prev) => {
      // Find last matching entry for this dishId
      const idx = [...prev].reverse().findIndex((c) => c.itemId === dishId);
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const updatedQty = prev[realIdx].qty + delta;
      if (updatedQty <= 0) {
        return prev.filter((_, i) => i !== realIdx);
      }
      const next = [...prev];
      next[realIdx] = { ...next[realIdx], qty: updatedQty };
      return next;
    });
  };

  const handleUpdateCartKeyQty = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.cartKey === cartKey ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const handleAddCrossSell = (cs: MenuItem) => {
    const targetRestId = cart[0]?.restaurantId || 'meghana-foods';
    const targetRestName = cart[0]?.restaurantName || 'Meghana Foods';
    commitItemToCart({
      cartKey: `${cs.id}::cross`,
      itemId: cs.id,
      restaurantId: targetRestId,
      restaurantName: targetRestName,
      name: cs.name,
      basePrice: cs.price,
      unitPrice: cs.price,
      qty: 1,
      diet: cs.diet,
      image: cs.image,
      selectedOptions: [],
      source: cart[0]?.source || 'food',
    });
  };

  const handleAddInstamartProduct = (prod: InstamartProduct) => {
    addItemWithConflictCheck({
      cartKey: `im::${prod.id}`,
      itemId: prod.id,
      restaurantId: 'swiggy-instamart',
      restaurantName: 'Swiggy Instamart (10m)',
      name: `${prod.name} (${prod.weight})`,
      basePrice: prod.price,
      unitPrice: prod.price,
      qty: 1,
      diet: prod.diet,
      image: prod.image,
      selectedOptions: ['10-Min Express Bag'],
      source: 'instamart',
    });
  };

  const handleApplyCoupon = (code: string | null) => {
    setAppliedCoupon(code);
    if (code) {
      showToast(`Coupon ${code} applied to your cart`);
    } else {
      showToast('Coupon removed');
    }
  };

  const handlePlaceOrder = async (checkoutPayload: {
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
  }) => {
    if (cart.length === 0) return;

    const first = cart[0];
    const restLocality =
      first.source === 'instamart'
        ? 'Indiranagar Hub'
        : RESTAURANTS.find((r) => r.id === first.restaurantId)?.locality || 'Indiranagar';

    const created = await appApi.createOrder({
      source: first.source,
      restaurantId: first.restaurantId,
      restaurantName: first.restaurantName,
      restaurantLocality: restLocality,
      items: cart,
      ...checkoutPayload,
      deliveryAddress: selectedAddress,
    });

    setOrders((prev) => [created, ...prev]);
    setTrackedOrderId(created.id);
    setCart([]);
    showToast(`Order #${created.orderNumber} confirmed!`);
    navigateTo('tracking');
  };

  const handleAdvanceOrderStep = async (orderId: string) => {
    const updated = await appApi.advanceOrder(orderId);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(
        updated.status === 'delivered'
          ? 'Order delivered at your doorstep!'
          : 'Updated live order progress',
      );
    }
  };

  const handleAddRiderTip = async (orderId: string, amount: number) => {
    const updated = await appApi.tipRider(orderId, amount);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Added ₹${amount} tip for ${updated.rider.name}`);
    }
  };

  const handleSendRiderMessage = async (orderId: string, text: string) => {
    const updated = await appApi.sendChat(orderId, text);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    }
  };

  const handleSelectAddress = async (addressId: string) => {
    setSelectedAddressId(addressId);
    await appApi.selectAddress(addressId);
    showToast('Updated delivery address');
  };

  const handleAddAddress = async (payload: {
    label: 'Home' | 'Work' | 'Other';
    shortArea: string;
    fullAddress: string;
  }) => {
    const data = await appApi.addAddress(payload);
    setAddresses(data.addresses);
    setSelectedAddressId(data.selectedAddressId);
    showToast(`Saved ${payload.label} address`);
  };

  const handleBookDineout = async (payload: {
    venue: DineoutVenue;
    dateLabel: string;
    timeSlot: string;
    guests: number;
  }) => {
    const data = await appApi.bookDineout({
      venueId: payload.venue.id,
      venueName: payload.venue.name,
      locality: payload.venue.locality,
      dateLabel: payload.dateLabel,
      timeSlot: payload.timeSlot,
      guests: payload.guests,
      discountOffer: payload.venue.discountOffer,
    });
    setDineoutBookings(data.dineoutBookings);
    showToast(`Table reserved at ${payload.venue.name} (#${data.booking.confirmationCode})`);
  };

  const handleBookGenie = async (payload: {
    pickupAddress: string;
    dropAddress: string;
    packageType: string;
    distanceKm: number;
    estimatedFare: number;
  }) => {
    const data = await appApi.bookGenie(payload);
    setGenieBookings(data.genieBookings);
    showToast('Genie delivery partner assigned!');
  };

  const handleReorder = (ord: OrderRecord) => {
    setCart(ord.items);
    showToast(`Loaded ${ord.items.length} items from ${ord.restaurantName}`);
    navigateTo('cart');
  };

  const handleRateOrder = async (
    orderId: string,
    payload: Omit<OrderRating, 'submittedAt'>,
  ) => {
    const updated = await appApi.rateOrder(orderId, payload);
    if (updated) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(
        `Rated ${updated.restaurantName} (${payload.restaurantStars}★) & ${updated.rider.name} (${payload.riderStars}★)`,
      );
    } else {
      showToast('Could not save rating right now. Please retry.');
    }
  };

  const subPageTitle =
    screen === 'restaurant'
      ? selectedRestaurant.name
      : screen === 'tracking'
        ? 'Live Order Tracking'
        : screen === 'genie'
          ? 'Swiggy Genie'
          : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header
        screen={screen}
        selectedAddress={selectedAddress}
        cartCount={cartCount}
        activeOrder={activeOrder && activeOrder.status !== 'delivered' ? activeOrder : null}
        onNavigate={navigateTo}
        onOpenAddressModal={() => setShowAddressModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
        subPageTitle={subPageTitle}
      />

      <main className="flex-1 w-full">
        {screen === 'home' && (
          <HomeView
            restaurants={RESTAURANTS}
            favorites={favorites}
            cart={cart}
            appliedCoupon={appliedCoupon}
            onSelectRestaurant={handleOpenRestaurant}
            onToggleFavorite={handleToggleFavorite}
            onApplyCoupon={(code) => handleApplyCoupon(code)}
            onQuickAddDish={handleAddOrCustomizeDish}
            onNavigate={navigateTo}
            onShowToast={showToast}
          />
        )}

        {screen === 'restaurant' && (
          <RestaurantDetailView
            restaurant={selectedRestaurant}
            isFavorite={favorites.includes(selectedRestaurant.id)}
            cart={cart}
            appliedCoupon={appliedCoupon}
            highlightDishId={highlightDishId}
            onToggleFavorite={() => handleToggleFavorite(selectedRestaurant.id)}
            onApplyCoupon={(code) => handleApplyCoupon(code)}
            onAddOrCustomizeDish={handleAddOrCustomizeDish}
            onUpdateDishQty={handleUpdateDishQtyByDishId}
            onNavigate={navigateTo}
            onShowToast={showToast}
          />
        )}

        {screen === 'cart' && (
          <CartCheckoutView
            cart={cart}
            activeRestaurant={cartRestaurant}
            selectedAddress={selectedAddress}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={handleApplyCoupon}
            onUpdateCartItemQty={handleUpdateCartKeyQty}
            onAddCrossSellItem={handleAddCrossSell}
            onOpenAddressModal={() => setShowAddressModal(true)}
            onPlaceOrder={handlePlaceOrder}
            onNavigate={navigateTo}
            onOpenRestaurant={(id) => handleOpenRestaurant(id)}
            onShowToast={showToast}
          />
        )}

        {screen === 'tracking' && (
          <OrderTrackingView
            order={activeOrder}
            onAdvanceOrderStep={handleAdvanceOrderStep}
            onAddRiderTip={handleAddRiderTip}
            onSendRiderMessage={handleSendRiderMessage}
            onNavigate={navigateTo}
            onOpenOrderHistory={() => setShowProfileModal(true)}
            onShowToast={showToast}
          />
        )}

        {screen === 'instamart' && (
          <InstamartView
            cart={cart}
            onAddInstamartItem={handleAddInstamartProduct}
            onUpdateInstamartQty={handleUpdateDishQtyByDishId}
            onNavigate={navigateTo}
          />
        )}

        {screen === 'dineout' && (
          <DineoutView bookings={dineoutBookings} onBookTable={handleBookDineout} />
        )}

        {screen === 'genie' && (
          <GenieView
            bookings={genieBookings}
            selectedAddress={selectedAddress}
            onBookGenie={handleBookGenie}
          />
        )}
      </main>

      <BottomNav screen={screen} cartCount={cartCount} onNavigate={navigateTo} />

      {/* Dish Customization Bottom Sheet */}
      {customizingTarget && (
        <DishCustomizationModal
          restaurant={customizingTarget.restaurant}
          dish={customizingTarget.dish}
          onClose={() => setCustomizingTarget(null)}
          onConfirmAdd={(selectedOptions, unitPrice) => {
            const { restaurant, dish } = customizingTarget;
            setCustomizingTarget(null);
            addItemWithConflictCheck({
              cartKey: `${dish.id}::${selectedOptions.join('|') || 'custom'}`,
              itemId: dish.id,
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              name: dish.name,
              basePrice: dish.price,
              unitPrice,
              qty: 1,
              diet: dish.diet,
              image: dish.image,
              selectedOptions,
              source: 'food',
            });
          }}
        />
      )}

      {/* Replace Cart Restaurant Conflict Modal */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-lg text-on-surface">
              Replace cart item?
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Your cart currently contains items from{' '}
              <span className="font-bold text-on-surface">{conflictModal.existingName}</span>. Do
              you want to discard them and add items from{' '}
              <span className="font-bold text-on-surface">{conflictModal.newName}</span>?
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-bold text-xs"
              >
                Keep Existing
              </button>
              <button
                type="button"
                onClick={conflictModal.onConfirmReplace}
                className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary font-bold text-xs"
              >
                Yes, Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Picker Modal */}
      {showAddressModal && (
        <AddressModal
          addresses={addresses}
          selectedAddressId={selectedAddress.id}
          onSelectAddress={handleSelectAddress}
          onAddAddress={handleAddAddress}
          onClose={() => setShowAddressModal(false)}
        />
      )}

      {/* Profile & Order History Modal */}
      {showProfileModal && (
        <ProfileOrdersModal
          orders={orders}
          favorites={favorites}
          restaurants={RESTAURANTS}
          onClose={() => setShowProfileModal(false)}
          onTrackOrder={(orderId) => {
            setTrackedOrderId(orderId);
            navigateTo('tracking');
          }}
          onReorder={handleReorder}
          onRateOrder={handleRateOrder}
          onOpenRestaurant={(id) => handleOpenRestaurant(id)}
        />
      )}

      {/* Non-Blocking Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 pointer-events-none"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
