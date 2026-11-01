export type DietType = 'veg' | 'non-veg';

export type AppScreen =
  | 'home'
  | 'restaurant'
  | 'cart'
  | 'tracking'
  | 'instamart'
  | 'dineout'
  | 'genie';

export interface CustomizationChoice {
  id: string;
  label: string;
  priceDelta: number;
  diet?: DietType;
}

export interface CustomizationGroup {
  id: string;
  title: string;
  required: boolean;
  multiSelect: boolean;
  choices: CustomizationChoice[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  diet: DietType;
  category: string;
  rating: number;
  ratingCount: string;
  image: string;
  badge?: 'bestseller' | 'must-try' | 'chef-special';
  isSpicy?: boolean;
  customizable?: boolean;
  customizationGroups?: CustomizationGroup[];
}

export interface RestaurantOffer {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  icon: 'percent' | 'payments' | 'local_shipping';
  tone: 'primary' | 'secondary' | 'tertiary';
}

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  locality: string;
  city: string;
  distanceKm: number;
  deliveryMins: number;
  deliveryRange: string;
  rating: number;
  ratingCount: string;
  costForTwo: number;
  costForTwoLabel: string;
  isPureVeg: boolean;
  isPremiumPartner?: boolean;
  isTopChain?: boolean;
  heroImage: string;
  thumbImage: string;
  discountHeadline: string;
  discountSubline?: string;
  fssaiLicense: string;
  fullAddress: string;
  offers: RestaurantOffer[];
  categories: string[];
  menu: MenuItem[];
}

export interface CartItem {
  cartKey: string;
  itemId: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  diet: DietType;
  image: string;
  selectedOptions: string[];
  source: 'food' | 'instamart';
}

export interface Coupon {
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat' | 'freedel';
  value: number;
  maxDiscount: number;
  minOrder: number;
  restaurantId?: string;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  shortArea: string;
  fullAddress: string;
  deliveryMins: number;
}

export type OrderStatusStep = 'confirmed' | 'prepared' | 'picked_up' | 'arriving' | 'delivered';

export interface RiderChatMessage {
  id: string;
  sender: 'user' | 'rider' | 'support';
  text: string;
  timestamp: string;
}

export interface OrderRating {
  restaurantStars: number;
  riderStars: number;
  restaurantTags: string[];
  riderTags: string[];
  comment: string;
  submittedAt: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
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
  status: OrderStatusStep;
  createdAtMs: number;
  etaMinutes: number;
  expectedByTime: string;
  timestamps: {
    confirmed: string;
    prepared: string;
    picked_up: string;
    arriving: string;
  };
  rider: {
    name: string;
    avatar: string;
    rating: number;
    deliveriesCount: string;
    phoneMasked: string;
    distanceAwayKm: number;
    progressRatio: number;
  };
  chatMessages: RiderChatMessage[];
  rating?: OrderRating;
}

export interface InstamartProduct {
  id: string;
  name: string;
  weight: string;
  price: number;
  mrp: number;
  category: string;
  image: string;
  diet: DietType;
}

export interface DineoutVenue {
  id: string;
  name: string;
  cuisines: string;
  locality: string;
  distanceKm: number;
  rating: number;
  costForTwo: string;
  discountOffer: string;
  image: string;
  nextSlots: string[];
}

export interface DineoutBooking {
  id: string;
  venueId: string;
  venueName: string;
  locality: string;
  dateLabel: string;
  timeSlot: string;
  guests: number;
  discountOffer: string;
  confirmationCode: string;
  createdAt: string;
}

export interface GenieBooking {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  packageType: string;
  distanceKm: number;
  estimatedFare: number;
  etaMins: number;
  status: string;
  createdAt: string;
}
