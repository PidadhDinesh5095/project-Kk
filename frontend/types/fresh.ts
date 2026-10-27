export interface Address { id: string; label: string; line1: string; city: string; pincode: string; isDefault: boolean; deliveryInstructions?: string; recipientName?: string; recipientPhone?: string; lat?: number; lng?: number; residenceType?: 'COMMUNITY_APARTMENT' | 'INDEPENDENT'; flatNoApartmentFloor?: string; blockTower?: string; landmark?: string }
export interface User { id: string; name: string; phone: string; walletBalance: number; paymentMethods: string[] }
export interface NutritionBenefit { label: string; value: string }

export type SubscriptionSlot = 'Morning' | 'Evening';
export type SubscriptionFrequency = 'Daily' | 'Alternate' | 'Custom';
export type SubscriptionApiStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type SubscriptionApiFrequency = 'DAILY' | 'ALTERNATE' | 'CUSTOM';

export interface Product {
  id: string;
  name: string;
  size: string;
  category: string;
  price: number;
  mrp: number;
  tags: string[];
  description: string;
  nextDeliveryDate: string;
  imageLabel: string;
  imageFile?: string;
  nutritionBenefits?: NutritionBenefit[];
  slug?: string;
  mainImgNobg?: string;
  images?: string[];
  nutrition?: Record<string, string | number | null> | null;
  qualityBadges?: string[];
  active?: boolean;
  createdAt?: string;
}
export interface CartItem { productId: string; quantity: number; oneTimeOrSubscription: 'one-time' | 'subscription' }
export type SubscriptionStatus = 'Active' | 'Paused' | 'Cancelled'
export type SubscriptionDayCode = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface SubscriptionPauseRange { reason?: string | null; startDate?: string | null; endDate?: string | null }

export interface Subscription {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  planTier?: 'Starter' | 'Family' | 'Bulk';
  quantityPerDelivery?: number;
  frequency: SubscriptionFrequency | 'Alternate Days' | 'Weekly';
  timeSlot?: SubscriptionSlot | 'Morning + Evening';
  startDate: string;
  durationType?: 'Ongoing' | 'EndDate';
  status: SubscriptionStatus;
  deliveryAddressId?: string;
  paymentMethod?: string;
  skippedDates?: string[];
  pausedRange?: { from: string; to: string } | null;
  pausedRanges?: SubscriptionPauseRange[];
  cancellationReason?: string | null;
  nextDeliveryDate?: string;
  createdDate?: string;
  userId?: string;
  addressId?: string;
  endDate?: string | null;
  dailyQuantity?: number;
  dailySlots?: Array<'MORNING' | 'EVENING'>;
  alternateConfig?: {
    startDateQuantity?: number;
    succeedingDayQuantity?: number;
  };
  customConfig?: {
    selectedDays?: SubscriptionDayCode[];
    quantityPerDay?: Record<string, number>;
  };
}
export type OrderStatus = 'Upcoming' | 'Delivered' | 'Cancelled'
export interface Order { id: string; orderId?: string; date: string; items: { productId: string; name: string; quantity: number; price: number; imageUri?: string }[]; itemTotal: number; deliveryFee: number; walletUsed: number; totalPaid: number; status: OrderStatus; deliveryAddress: string; deliverySlot?: string; paymentStatus?: string }
export interface OrderInvoice { invoiceNumber: string; orderId: string; dateGenerated: string; billedTo: string; deliveryAddress: string; productName: string; quantity: number; rate: number; subtotal: number; total: number; paymentMode: string }
export interface Invoice { id: string; orderId: string; gstin: string; sellerName: string; billedTo: string; lineItems: { name: string; quantity: number; rate: number; amount: number }[]; subtotal: number; cgst: number; sgst: number; total: number; paymentMode: string; dateGenerated: string }
export interface Notification { id: string; type: string; title: string; body: string; timestamp: string; isRead: boolean }
export interface WalletTransaction { id: string; type: 'top-up' | 'payment' | 'cashback'; title: string; timestamp: string; amount: number; direction: 'credit' | 'debit' }
