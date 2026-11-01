import type {
  CartItem,
  DineoutBooking,
  GenieBooking,
  OrderRating,
  OrderRecord,
  OrderStatusStep,
  RiderChatMessage,
  SavedAddress,
} from '../types';
import { BRAND_ASSETS, DEFAULT_ADDRESSES, DISH_IMAGES } from '../data/catalog';

const STATIC_STORE_KEY = 'swiggy_static_store_v1';

export interface AppBootstrapState {
  favorites: string[];
  addresses: SavedAddress[];
  selectedAddressId: string;
  orders: OrderRecord[];
  dineoutBookings: DineoutBooking[];
  genieBookings: GenieBooking[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function createSeedDeliveredOrder(): OrderRecord {
  return {
    id: 'ord-seed-delivered-1',
    orderNumber: 'SWG-884120',
    source: 'food',
    restaurantId: 'truffles-cafe',
    restaurantName: 'Truffles Cafe',
    restaurantLocality: 'Koramangala',
    items: [
      {
        cartKey: 'truf-m1::Extra Aged Cheddar Slice',
        itemId: 'truf-m1',
        restaurantId: 'truffles-cafe',
        restaurantName: 'Truffles Cafe',
        name: 'All American Double Cheese Burger',
        basePrice: 265,
        unitPrice: 300,
        qty: 1,
        diet: 'non-veg',
        image: DISH_IMAGES.trufflesCover,
        selectedOptions: ['Extra Aged Cheddar Slice'],
        source: 'food',
      },
      {
        cartKey: 'truf-m4::default',
        itemId: 'truf-m4',
        restaurantId: 'truffles-cafe',
        restaurantName: 'Truffles Cafe',
        name: 'Dutch Truffle Chocolate Pastry',
        basePrice: 165,
        unitPrice: 165,
        qty: 1,
        diet: 'veg',
        image: DISH_IMAGES.catCakes,
        selectedOptions: [],
        source: 'food',
      },
    ],
    itemTotal: 465,
    deliveryFee: 0,
    platformFee: 6,
    gstAndCharges: 34.25,
    tipAmount: 30,
    couponCode: 'WELCOME50',
    couponDiscount: 120,
    totalPaid: 415.25,
    totalSavings: 155,
    paymentMethod: 'Google Pay',
    deliveryInstructions: ['Leave at door'],
    deliveryAddress: DEFAULT_ADDRESSES[0],
    status: 'delivered',
    createdAtMs: Date.now() - 86400000,
    etaMinutes: 0,
    expectedByTime: '8:40 PM',
    timestamps: {
      confirmed: '8:12 PM',
      prepared: '8:21 PM',
      picked_up: '8:26 PM',
      arriving: '8:38 PM',
    },
    rider: {
      name: 'Ramesh Kumar',
      avatar: BRAND_ASSETS.riderAvatar,
      rating: 4.9,
      deliveriesCount: '3,400+',
      phoneMasked: '+91 98765 43210',
      distanceAwayKm: 0,
      progressRatio: 1,
    },
    chatMessages: [
      {
        id: 'msg-seed-1',
        sender: 'rider',
        text: 'Order delivered safely! Enjoy your meal.',
        timestamp: '8:38 PM',
      },
    ],
  };
}

function syncOrderLiveTelemetry(order: OrderRecord): OrderRecord {
  if (order.status === 'delivered') {
    return {
      ...order,
      etaMinutes: 0,
      rider: {
        ...order.rider,
        distanceAwayKm: 0,
        progressRatio: 1,
      },
    };
  }

  const elapsedSeconds = Math.max(0, (Date.now() - order.createdAtMs) / 1000);
  const naturalRatio = Math.min(1, 0.22 + elapsedSeconds / 180);
  const effectiveRatio = Math.max(order.rider.progressRatio, naturalRatio);

  let derivedStatus: OrderStatusStep = order.status;
  if (effectiveRatio >= 0.98) {
    derivedStatus = 'delivered';
  } else if (effectiveRatio >= 0.8) {
    derivedStatus = 'arriving';
  } else if (effectiveRatio >= 0.45) {
    derivedStatus = 'picked_up';
  } else if (effectiveRatio >= 0.25) {
    derivedStatus = 'prepared';
  }

  const stepRank: Record<OrderStatusStep, number> = {
    confirmed: 0,
    prepared: 1,
    picked_up: 2,
    arriving: 3,
    delivered: 4,
  };

  const finalStatus =
    stepRank[derivedStatus] > stepRank[order.status] ? derivedStatus : order.status;

  const baseEta = order.source === 'instamart' ? 10 : 22;
  const remainingMins =
    finalStatus === 'delivered'
      ? 0
      : Math.max(1, Math.round(baseEta * (1 - effectiveRatio * 0.92)));
  const remainingKm =
    finalStatus === 'delivered'
      ? 0
      : Number(Math.max(0.1, 2.4 * (1 - effectiveRatio)).toFixed(1));

  return {
    ...order,
    status: finalStatus,
    etaMinutes: remainingMins,
    rider: {
      ...order.rider,
      distanceAwayKm: remainingKm,
      progressRatio: Number(effectiveRatio.toFixed(3)),
    },
  };
}

function loadLocalStore(): AppBootstrapState {
  const fallback: AppBootstrapState = {
    favorites: ['meghana-foods'],
    addresses: DEFAULT_ADDRESSES,
    selectedAddressId: 'addr-home',
    orders: [createSeedDeliveredOrder()],
    dineoutBookings: [],
    genieBookings: [],
  };

  try {
    const raw = window.localStorage.getItem(STATIC_STORE_KEY);
    if (!raw) {
      saveLocalStore(fallback);
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<AppBootstrapState>;
    const hydrated: AppBootstrapState = {
      ...fallback,
      ...parsed,
      addresses:
        parsed.addresses && parsed.addresses.length > 0 ? parsed.addresses : DEFAULT_ADDRESSES,
      orders:
        parsed.orders && parsed.orders.length > 0
          ? parsed.orders.map(syncOrderLiveTelemetry)
          : [createSeedDeliveredOrder()],
    };
    saveLocalStore(hydrated);
    return hydrated;
  } catch {
    return fallback;
  }
}

function saveLocalStore(state: AppBootstrapState): void {
  try {
    window.localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

async function tryJsonFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const appApi = {
  async bootstrap(): Promise<AppBootstrapState> {
    const remote = await tryJsonFetch<AppBootstrapState>('./api/bootstrap');
    if (remote) {
      saveLocalStore(remote);
      return remote;
    }
    return loadLocalStore();
  },

  async toggleFavorite(restaurantId: string): Promise<string[]> {
    const remote = await tryJsonFetch<{ favorites: string[] }>('./api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    });
    if (remote && Array.isArray(remote.favorites)) {
      return remote.favorites;
    }

    const store = loadLocalStore();
    const idx = store.favorites.indexOf(restaurantId);
    if (idx >= 0) store.favorites.splice(idx, 1);
    else store.favorites.push(restaurantId);
    saveLocalStore(store);
    return store.favorites;
  },

  async selectAddress(addressId: string): Promise<{
    addresses: SavedAddress[];
    selectedAddressId: string;
  }> {
    const remote = await tryJsonFetch<{
      addresses: SavedAddress[];
      selectedAddressId: string;
    }>('./api/addresses/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressId }),
    });
    if (remote) return remote;

    const store = loadLocalStore();
    if (store.addresses.some((a) => a.id === addressId)) {
      store.selectedAddressId = addressId;
      saveLocalStore(store);
    }
    return { addresses: store.addresses, selectedAddressId: store.selectedAddressId };
  },

  async addAddress(payload: {
    label: 'Home' | 'Work' | 'Other';
    shortArea: string;
    fullAddress: string;
  }): Promise<{ addresses: SavedAddress[]; selectedAddressId: string }> {
    const remote = await tryJsonFetch<{
      addresses: SavedAddress[];
      selectedAddressId: string;
    }>('./api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (remote) return remote;

    const store = loadLocalStore();
    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: payload.label,
      shortArea: payload.shortArea.trim(),
      fullAddress: payload.fullAddress.trim(),
      deliveryMins: 26,
    };
    store.addresses.unshift(newAddr);
    store.selectedAddressId = newAddr.id;
    saveLocalStore(store);
    return { addresses: store.addresses, selectedAddressId: store.selectedAddressId };
  },

  async createOrder(body: {
    source: 'food' | 'instamart';
    restaurantId: string;
    restaurantName: string;
    restaurantLocality: string;
    items: CartItem[];
    itemTotal: number;
    deliveryFee: number;
    platformFee: number;
    gstAndCharges: number;
    tipAmount: number;
    couponCode: string | null;
    couponDiscount: number;
    totalPaid: number;
    totalSavings: number;
    paymentMethod: string;
    deliveryInstructions: string[];
    deliveryAddress: SavedAddress;
  }): Promise<OrderRecord> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>('./api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const now = new Date();
    const etaMins = body.source === 'instamart' ? 10 : 18;
    const confirmedTime = formatTime(new Date(now.getTime() - 10 * 60 * 1000));
    const preparedTime = formatTime(new Date(now.getTime() - 4 * 60 * 1000));
    const pickedUpTime = formatTime(now);
    const expectedTime = formatTime(new Date(now.getTime() + etaMins * 60 * 1000));

    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber: `SWG-${Math.floor(900000 + Math.random() * 99999)}`,
      source: body.source,
      restaurantId: body.restaurantId,
      restaurantName: body.restaurantName,
      restaurantLocality: body.restaurantLocality,
      items: body.items,
      itemTotal: body.itemTotal,
      deliveryFee: body.deliveryFee,
      platformFee: body.platformFee,
      gstAndCharges: body.gstAndCharges,
      tipAmount: body.tipAmount,
      couponCode: body.couponCode,
      couponDiscount: body.couponDiscount,
      totalPaid: body.totalPaid,
      totalSavings: body.totalSavings,
      paymentMethod: body.paymentMethod || 'Google Pay',
      deliveryInstructions: body.deliveryInstructions || [],
      deliveryAddress: body.deliveryAddress,
      status: 'picked_up',
      createdAtMs: Date.now() - 45000,
      etaMinutes: etaMins,
      expectedByTime: expectedTime,
      timestamps: {
        confirmed: confirmedTime,
        prepared: preparedTime,
        picked_up: pickedUpTime,
        arriving: `~${expectedTime}`,
      },
      rider: {
        name: 'Ramesh Kumar',
        avatar: BRAND_ASSETS.riderAvatar,
        rating: 4.9,
        deliveriesCount: '3,400+',
        phoneMasked: '+91 98765 43210',
        distanceAwayKm: 1.4,
        progressRatio: 0.52,
      },
      chatMessages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'rider',
          text: `Namaste! I've picked up your fresh order from ${body.restaurantName} in a thermal bag and I'm riding towards ${body.deliveryAddress.shortArea}.`,
          timestamp: pickedUpTime,
        },
      ],
    };

    store.orders.unshift(newOrder);
    saveLocalStore(store);
    return newOrder;
  },

  async pollOrder(orderId: string): Promise<OrderRecord | null> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>(`./api/orders/${orderId}`);
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const idx = store.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    store.orders[idx] = syncOrderLiveTelemetry(store.orders[idx]);
    saveLocalStore(store);
    return store.orders[idx];
  },

  async advanceOrder(orderId: string): Promise<OrderRecord | null> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>(
      `./api/orders/${orderId}/advance`,
      { method: 'POST' },
    );
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const idx = store.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const order = store.orders[idx];
    const sequence: OrderStatusStep[] = [
      'confirmed',
      'prepared',
      'picked_up',
      'arriving',
      'delivered',
    ];
    const currentIdx = sequence.indexOf(order.status);
    const nextStatus = sequence[Math.min(sequence.length - 1, currentIdx + 1)];
    const ratioByStep: Record<OrderStatusStep, number> = {
      confirmed: 0.15,
      prepared: 0.35,
      picked_up: 0.58,
      arriving: 0.86,
      delivered: 1,
    };

    order.status = nextStatus;
    order.rider.progressRatio = Math.max(order.rider.progressRatio, ratioByStep[nextStatus]);
    if (nextStatus === 'arriving') {
      order.chatMessages.push({
        id: `msg-${Date.now()}`,
        sender: 'rider',
        text: 'I have reached outside your apartment gate on 12th Main Road. Coming up shortly!',
        timestamp: formatTime(new Date()),
      });
    } else if (nextStatus === 'delivered') {
      order.chatMessages.push({
        id: `msg-${Date.now()}`,
        sender: 'rider',
        text: 'Order delivered safely! Enjoy your meal.',
        timestamp: formatTime(new Date()),
      });
    }

    store.orders[idx] = syncOrderLiveTelemetry(order);
    saveLocalStore(store);
    return store.orders[idx];
  },

  async tipRider(orderId: string, amount: number): Promise<OrderRecord | null> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>(`./api/orders/${orderId}/tip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const idx = store.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    if (amount > 0) {
      store.orders[idx].tipAmount += amount;
      store.orders[idx].totalPaid = Number(
        (store.orders[idx].totalPaid + amount).toFixed(2),
      );
      store.orders[idx].chatMessages.push({
        id: `msg-${Date.now()}`,
        sender: 'rider',
        text: `Thank you so much for the ₹${amount} tip! Really appreciate your kindness 🙏`,
        timestamp: formatTime(new Date()),
      });
      saveLocalStore(store);
    }
    return store.orders[idx];
  },

  async sendChat(orderId: string, text: string): Promise<OrderRecord | null> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>(`./api/orders/${orderId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const idx = store.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    const nowLabel = formatTime(new Date());
    const userMsg: RiderChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: text.trim(),
      timestamp: nowLabel,
    };
    store.orders[idx].chatMessages.push(userMsg);

    const lower = text.toLowerCase();
    let reply =
      "Got it! I'm riding carefully along 100 Feet Road and will follow your instructions.";
    if (lower.includes('where') || lower.includes('reach') || lower.includes('eta')) {
      reply = `I'm currently ${store.orders[idx].rider.distanceAwayKm} km away near CMH Road junction — should reach you in ~${store.orders[idx].etaMinutes} mins!`;
    } else if (lower.includes('door') || lower.includes('security') || lower.includes('gate')) {
      reply =
        'Sure thing, I will coordinate at the gate/doorstep and send you a quick update once placed.';
    } else if (lower.includes('call') || lower.includes('bell')) {
      reply = 'Noted! Will avoid ringing the bell and follow your preference.';
    }

    store.orders[idx].chatMessages.push({
      id: `msg-${Date.now()}-r`,
      sender: 'rider',
      text: reply,
      timestamp: nowLabel,
    });
    saveLocalStore(store);
    return store.orders[idx];
  },

  async rateOrder(
    orderId: string,
    payload: Omit<OrderRating, 'submittedAt'>,
  ): Promise<OrderRecord | null> {
    const remote = await tryJsonFetch<{ order: OrderRecord }>(`./api/orders/${orderId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (remote?.order) return remote.order;

    const store = loadLocalStore();
    const idx = store.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;

    store.orders[idx].rating = {
      ...payload,
      submittedAt: formatTime(new Date()),
    };
    saveLocalStore(store);
    return store.orders[idx];
  },

  async bookDineout(payload: {
    venueId: string;
    venueName: string;
    locality: string;
    dateLabel: string;
    timeSlot: string;
    guests: number;
    discountOffer: string;
  }): Promise<{ booking: DineoutBooking; dineoutBookings: DineoutBooking[] }> {
    const remote = await tryJsonFetch<{
      booking: DineoutBooking;
      dineoutBookings: DineoutBooking[];
    }>('./api/dineout/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (remote) return remote;

    const store = loadLocalStore();
    const booking: DineoutBooking = {
      id: `dine-${Date.now()}`,
      venueId: payload.venueId,
      venueName: payload.venueName,
      locality: payload.locality,
      dateLabel: payload.dateLabel,
      timeSlot: payload.timeSlot,
      guests: payload.guests,
      discountOffer: payload.discountOffer,
      confirmationCode: `DIN-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: formatTime(new Date()),
    };
    store.dineoutBookings.unshift(booking);
    saveLocalStore(store);
    return { booking, dineoutBookings: store.dineoutBookings };
  },

  async bookGenie(payload: {
    pickupAddress: string;
    dropAddress: string;
    packageType: string;
    distanceKm: number;
    estimatedFare: number;
  }): Promise<{ booking: GenieBooking; genieBookings: GenieBooking[] }> {
    const remote = await tryJsonFetch<{
      booking: GenieBooking;
      genieBookings: GenieBooking[];
    }>('./api/genie/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (remote) return remote;

    const store = loadLocalStore();
    const booking: GenieBooking = {
      id: `genie-${Date.now()}`,
      pickupAddress: payload.pickupAddress,
      dropAddress: payload.dropAddress,
      packageType: payload.packageType,
      distanceKm: payload.distanceKm,
      estimatedFare: payload.estimatedFare,
      etaMins: 9,
      status: 'Rider Assigned • Arriving for Pickup in 9 mins',
      createdAt: formatTime(new Date()),
    };
    store.genieBookings.unshift(booking);
    saveLocalStore(store);
    return { booking, genieBookings: store.genieBookings };
  },
};
