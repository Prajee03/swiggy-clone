import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CartItem,
  DineoutBooking,
  GenieBooking,
  OrderRating,
  OrderRecord,
  OrderStatusStep,
  RiderChatMessage,
  SavedAddress,
} from './src/types.ts';
import { BRAND_ASSETS, DEFAULT_ADDRESSES, DISH_IMAGES } from './src/data/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface ServerStore {
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

function createInitialStore(): ServerStore {
  return {
    favorites: ['meghana-foods'],
    addresses: DEFAULT_ADDRESSES,
    selectedAddressId: 'addr-home',
    orders: [createSeedDeliveredOrder()],
    dineoutBookings: [],
    genieBookings: [],
  };
}

function loadStore(): ServerStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerStore>;
      const orders =
        parsed.orders && parsed.orders.length > 0
          ? parsed.orders
          : [createSeedDeliveredOrder()];
      const hydrated = {
        ...createInitialStore(),
        ...parsed,
        orders,
        addresses:
          parsed.addresses && parsed.addresses.length > 0
            ? parsed.addresses
            : DEFAULT_ADDRESSES,
      };
      saveStore(hydrated);
      return hydrated;
    }
  } catch (err) {
    console.error('Failed to read store, resetting:', err);
  }
  const initial = createInitialStore();
  saveStore(initial);
  return initial;
}

function saveStore(store: ServerStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
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
  // Smooth real-time progression over ~180 seconds unless manually advanced
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

let store = loadStore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/bootstrap', (_req: Request, res: Response) => {
    store.orders = store.orders.map(syncOrderLiveTelemetry);
    saveStore(store);
    res.json(store);
  });

  app.post('/api/favorites/toggle', (req: Request, res: Response) => {
    const { restaurantId } = req.body as { restaurantId?: string };
    if (!restaurantId) {
      res.status(400).json({ error: 'restaurantId is required' });
      return;
    }
    const idx = store.favorites.indexOf(restaurantId);
    if (idx >= 0) {
      store.favorites.splice(idx, 1);
    } else {
      store.favorites.push(restaurantId);
    }
    saveStore(store);
    res.json({ favorites: store.favorites });
  });

  app.post('/api/addresses/select', (req: Request, res: Response) => {
    const { addressId } = req.body as { addressId?: string };
    if (addressId && store.addresses.some((a) => a.id === addressId)) {
      store.selectedAddressId = addressId;
      saveStore(store);
    }
    res.json({
      addresses: store.addresses,
      selectedAddressId: store.selectedAddressId,
    });
  });

  app.post('/api/addresses', (req: Request, res: Response) => {
    const { label, shortArea, fullAddress } = req.body as {
      label?: 'Home' | 'Work' | 'Other';
      shortArea?: string;
      fullAddress?: string;
    };
    if (!shortArea || !fullAddress) {
      res.status(400).json({ error: 'Address details are required' });
      return;
    }
    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: label || 'Other',
      shortArea: shortArea.trim(),
      fullAddress: fullAddress.trim(),
      deliveryMins: 26,
    };
    store.addresses.unshift(newAddr);
    store.selectedAddressId = newAddr.id;
    saveStore(store);
    res.json({
      addresses: store.addresses,
      selectedAddressId: store.selectedAddressId,
    });
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const body = req.body as {
      source?: 'food' | 'instamart';
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
    };

    if (!body.items || body.items.length === 0) {
      res.status(400).json({ error: 'Order must contain at least one item' });
      return;
    }

    const now = new Date();
    const etaMins = body.source === 'instamart' ? 10 : 18;
    const confirmedTime = formatTime(new Date(now.getTime() - 10 * 60 * 1000));
    const preparedTime = formatTime(new Date(now.getTime() - 4 * 60 * 1000));
    const pickedUpTime = formatTime(now);
    const expectedTime = formatTime(new Date(now.getTime() + etaMins * 60 * 1000));

    const randomCode = Math.floor(900000 + Math.random() * 99999);
    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber: `SWG-${randomCode}`,
      source: body.source || 'food',
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
      deliveryAddress: body.deliveryAddress || store.addresses[0],
      status: 'picked_up',
      createdAtMs: Date.now() - 45000, // Start right at "Order on the way" so map tracking is immediately lively!
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
          text: `Namaste! I've picked up your fresh order from ${body.restaurantName} in a thermal bag and I'm riding towards ${body.deliveryAddress?.shortArea || 'your location'}.`,
          timestamp: pickedUpTime,
        },
      ],
    };

    store.orders.unshift(newOrder);
    saveStore(store);
    res.status(201).json({ order: newOrder });
  });

  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    store.orders[idx] = syncOrderLiveTelemetry(store.orders[idx]);
    saveStore(store);
    res.json({ order: store.orders[idx] });
  });

  app.post('/api/orders/:id/advance', (req: Request, res: Response) => {
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
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
    saveStore(store);
    res.json({ order: store.orders[idx] });
  });

  app.post('/api/orders/:id/tip', (req: Request, res: Response) => {
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const { amount } = req.body as { amount?: number };
    const extraTip = Number(amount) || 0;
    if (extraTip > 0) {
      store.orders[idx].tipAmount += extraTip;
      store.orders[idx].totalPaid = Number(
        (store.orders[idx].totalPaid + extraTip).toFixed(2),
      );
      store.orders[idx].chatMessages.push({
        id: `msg-${Date.now()}`,
        sender: 'rider',
        text: `Thank you so much for the ₹${extraTip} tip! Really appreciate your kindness 🙏`,
        timestamp: formatTime(new Date()),
      });
      saveStore(store);
    }
    res.json({ order: store.orders[idx] });
  });

  app.post('/api/orders/:id/chat', (req: Request, res: Response) => {
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message text required' });
      return;
    }

    const nowLabel = formatTime(new Date());
    const userMsg: RiderChatMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: text.trim(),
      timestamp: nowLabel,
    };
    store.orders[idx].chatMessages.push(userMsg);

    const lower = text.toLowerCase();
    let reply = "Got it! I'm riding carefully along 100 Feet Road and will follow your instructions.";
    if (lower.includes('where') || lower.includes('reach') || lower.includes('eta')) {
      reply = `I'm currently ${store.orders[idx].rider.distanceAwayKm} km away near CMH Road junction — should reach you in ~${store.orders[idx].etaMinutes} mins!`;
    } else if (lower.includes('door') || lower.includes('security') || lower.includes('gate')) {
      reply = 'Sure thing, I will coordinate at the gate/doorstep and send you a quick update once placed.';
    } else if (lower.includes('call') || lower.includes('bell')) {
      reply = 'Noted! Will avoid ringing the bell and follow your preference.';
    }

    store.orders[idx].chatMessages.push({
      id: `msg-${Date.now()}-r`,
      sender: 'rider',
      text: reply,
      timestamp: nowLabel,
    });

    saveStore(store);
    res.json({ order: store.orders[idx] });
  });

  app.post('/api/orders/:id/rate', (req: Request, res: Response) => {
    const idx = store.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    store.orders[idx] = syncOrderLiveTelemetry(store.orders[idx]);
    if (store.orders[idx].status !== 'delivered') {
      res.status(400).json({ error: 'Only delivered orders can be rated' });
      return;
    }

    const { restaurantStars, riderStars, restaurantTags, riderTags, comment } = req.body as {
      restaurantStars?: number;
      riderStars?: number;
      restaurantTags?: string[];
      riderTags?: string[];
      comment?: string;
    };

    const rStars = Math.round(Number(restaurantStars) || 0);
    const dStars = Math.round(Number(riderStars) || 0);
    if (rStars < 1 || rStars > 5 || dStars < 1 || dStars > 5) {
      res.status(400).json({ error: 'Please select 1 to 5 stars for both restaurant and rider' });
      return;
    }

    const rating: OrderRating = {
      restaurantStars: rStars,
      riderStars: dStars,
      restaurantTags: Array.isArray(restaurantTags) ? restaurantTags.slice(0, 6) : [],
      riderTags: Array.isArray(riderTags) ? riderTags.slice(0, 6) : [],
      comment: typeof comment === 'string' ? comment.trim().slice(0, 300) : '',
      submittedAt: formatTime(new Date()),
    };

    store.orders[idx].rating = rating;
    saveStore(store);
    res.json({ order: store.orders[idx] });
  });

  app.post('/api/dineout/book', (req: Request, res: Response) => {
    const { venueId, venueName, locality, dateLabel, timeSlot, guests, discountOffer } =
      req.body as Partial<DineoutBooking>;
    if (!venueId || !venueName || !timeSlot) {
      res.status(400).json({ error: 'Missing reservation details' });
      return;
    }
    const booking: DineoutBooking = {
      id: `dine-${Date.now()}`,
      venueId,
      venueName,
      locality: locality || 'Indiranagar',
      dateLabel: dateLabel || 'Tonight',
      timeSlot,
      guests: Number(guests) || 2,
      discountOffer: discountOffer || 'Flat 25% OFF',
      confirmationCode: `DIN-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: formatTime(new Date()),
    };
    store.dineoutBookings.unshift(booking);
    saveStore(store);
    res.status(201).json({ booking, dineoutBookings: store.dineoutBookings });
  });

  app.post('/api/genie/book', (req: Request, res: Response) => {
    const { pickupAddress, dropAddress, packageType, distanceKm, estimatedFare } =
      req.body as Partial<GenieBooking>;
    if (!pickupAddress || !dropAddress) {
      res.status(400).json({ error: 'Pickup and drop addresses are required' });
      return;
    }
    const booking: GenieBooking = {
      id: `genie-${Date.now()}`,
      pickupAddress,
      dropAddress,
      packageType: packageType || 'Documents & Keys',
      distanceKm: Number(distanceKm) || 3.4,
      estimatedFare: Number(estimatedFare) || 68,
      etaMins: 9,
      status: 'Rider Assigned • Arriving for Pickup in 9 mins',
      createdAt: formatTime(new Date()),
    };
    store.genieBookings.unshift(booking);
    saveStore(store);
    res.status(201).json({ booking, genieBookings: store.genieBookings });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
