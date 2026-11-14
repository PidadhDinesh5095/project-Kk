import { Address, Invoice, Notification, Order, Product, Subscription, WalletTransaction } from '@/types/fresh';

export const address: Address = { id: 'home', label: 'Home', line1: '12 Lake View Apartments, HSR Layout', city: 'Bangalore', pincode: '560102', isDefault: true, isServiceable: true };
const milkNutrition = [
  { label: 'Protein (g)', value: '3.3' },
  { label: 'Sodium (mg)', value: '40.0' },
  { label: 'Calcium (mg)', value: '120.0' },
  { label: 'Energy (kcal)', value: '66.0' },
  { label: 'Total Fat (g)', value: '3.6' },
  { label: 'Carbohydrate (g)', value: '5.0' },
];

const paneerNutrition = [
  { label: 'Protein (g)', value: '18.0' },
  { label: 'Calcium (mg)', value: '210.0' },
  { label: 'Fat (g)', value: '20.0' },
  { label: 'Energy (kcal)', value: '265.0' },
  { label: 'Carbohydrate (g)', value: '6.5' },
  { label: 'Sodium (mg)', value: '15.0' },
];

const curdNutrition = [
  { label: 'Protein (g)', value: '4.2' },
  { label: 'Calcium (mg)', value: '150.0' },
  { label: 'Energy (kcal)', value: '72.0' },
  { label: 'Total Fat (g)', value: '4.0' },
  { label: 'Carbohydrate (g)', value: '4.8' },
  { label: 'Sodium (mg)', value: '35.0' },
];

const gheeNutrition = [
  { label: 'Energy (kcal)', value: '900.0' },
  { label: 'Total Fat (g)', value: '99.0' },
  { label: 'Saturated Fat (g)', value: '62.0' },
  { label: 'Carbohydrate (g)', value: '0.0' },
  { label: 'Protein (g)', value: '0.0' },
  { label: 'Calcium (mg)', value: '0.0' },
];

const butterNutrition = [
  { label: 'Energy (kcal)', value: '717.0' },
  { label: 'Total Fat (g)', value: '81.0' },
  { label: 'Saturated Fat (g)', value: '51.0' },
  { label: 'Carbohydrate (g)', value: '0.0' },
  { label: 'Protein (g)', value: '0.5' },
  { label: 'Calcium (mg)', value: '24.0' },
];

export const products: Product[] = [
  { id: 'buffalo', name: 'A2 Buffalo Milk', size: '500 ml', category: 'Milk', price: 72, mrp: 80, tags: ['A2 Protein', 'Rich & Creamy'], description: 'Rich and creamy A2 buffalo milk with a naturally wholesome taste and smooth finish. Every batch is tested for purity, freshness and quality so your daily routine stays nourishing and balanced.', nextDeliveryDate: '2026-09-08', imageLabel: 'A2 Buffalo Milk', imageFile: 'A2BufalloMilk-removebg-preview.png', nutritionBenefits: milkNutrition },
  { id: 'cow', name: 'Cow Milk', size: '500 ml', category: 'Milk', price: 58, mrp: 64, tags: ['Light', 'Everyday'], description: 'Try our Pure Cow Milk! Every batch is tested, every packet is pure. Free from antibiotics, hormones, preservatives and harmful additives. Naturally light, wholesome and delicious. We do the safety checks; you do the taste check.', nextDeliveryDate: '2026-09-08', imageLabel: 'Cow Milk', imageFile: 'CowMilk-removebg-preview.png', nutritionBenefits: milkNutrition },
  { id: 'cream', name: 'High Protein Milk', size: '500 ml', category: 'Milk', price: 82, mrp: 90, tags: ['Protein Boost', 'Fortified'], description: 'Protein enriched milk designed for active families and growing kids. It delivers a fuller, more satisfying sip while staying gentle on the stomach and reliable for your everyday wellness routine.', nextDeliveryDate: '2026-09-08', imageLabel: 'High Protein Milk', imageFile: 'HighProteinMilk-removebg-preview.png', nutritionBenefits: milkNutrition },
  { id: 'toned-milk', name: 'Toned Milk', size: '500 ml', category: 'Milk', price: 60, mrp: 66, tags: ['Low Fat', 'Everyday'], description: 'Light toned milk for a healthy routine with a clean taste, balanced nutrients and a smooth finish. It is ideal for tea, coffee and daily breakfast needs without compromising on nourishment.', nextDeliveryDate: '2026-09-08', imageLabel: 'Toned Milk', imageFile: 'TonedMilk-removebg-preview.png', nutritionBenefits: milkNutrition },
  { id: 'skim-milk', name: 'Skim Milk', size: '500 ml', category: 'Milk', price: 68, mrp: 74, tags: ['Low Fat', 'High Protein'], description: 'Protein-rich and light skim milk that supports an active lifestyle. It keeps the taste clean and refreshing while offering satisfying nutrition with less fat and fewer calories.', nextDeliveryDate: '2026-09-08', imageLabel: 'Skim Milk', imageFile: 'SkimMilk-removebg-preview.png', nutritionBenefits: milkNutrition },
  { id: 'paneer', name: 'Malaipanner', size: '250 g', category: 'Paneer', price: 110, mrp: 125, tags: ['Soft', 'Fresh'], description: 'Soft, fresh paneer made every morning with rich milky flavour and a clean, creamy texture. It is perfect for curries, snacks and quick home-style meals that call for wholesome ingredients.', nextDeliveryDate: '2026-09-08', imageLabel: 'Malaipanner', imageFile: 'malaipanner-removebg-preview.png', nutritionBenefits: paneerNutrition },
  { id: 'curd', name: 'Curd', size: '400 g', category: 'Curd', price: 48, mrp: 55, tags: ['Probiotic', 'Thick'], description: 'Thick, naturally set curd with a tangy, homemade taste and rich texture. It is a comforting dairy staple that supports gut health and adds freshness to everyday meals.', nextDeliveryDate: '2026-09-08', imageLabel: 'Curd', imageFile: 'Curd-removebg-preview.png', nutritionBenefits: curdNutrition },
  { id: 'cow-curd', name: 'Cow Curd', size: '400 g', category: 'Curd', price: 52, mrp: 60, tags: ['Creamy', 'Fresh'], description: 'Creamy curd with a rich homemade taste and soft texture. Freshly prepared every day to bring the goodness of pure cow milk to your regular diet and family meals.', nextDeliveryDate: '2026-09-08', imageLabel: 'Cow Curd', imageFile: 'CowCurd-removebg-preview.png', nutritionBenefits: curdNutrition },
  { id: 'ghee', name: 'Buffalo Ghee', size: '350 gms', category: 'Ghee', price: 690, mrp: 760, tags: ['Pure', 'Aromatic'], description: 'Small-batch buffalo ghee with rich aroma, golden colour and the unmistakable taste of traditional dairy craftsmanship. Perfect for cooking, tadkas and comforting family recipes.', nextDeliveryDate: '2026-09-08', imageLabel: 'Buffalo Ghee', imageFile: 'buffaloghee-removebg-preview.png', nutritionBenefits: gheeNutrition },
  { id: 'cow-ghee', name: 'Cow Ghee', size: '350 gms', category: 'Ghee', price: 650, mrp: 720, tags: ['Cultured', 'Pure'], description: 'Golden, aromatic ghee made from fresh cow milk with a subtly nutty flavour and deep, traditional richness. Ideal for meals that deserve an authentic finish.', nextDeliveryDate: '2026-09-08', imageLabel: 'Cow Ghee', imageFile: 'cowghee-removebg-preview.png', nutritionBenefits: gheeNutrition },
  { id: 'buffalo-butter', name: 'Buffalo Butter', size: '200 g', category: 'Butter', price: 140, mrp: 160, tags: ['Creamy', 'Farm Fresh'], description: 'Rich buffalo butter crafted for everyday cooking and indulgent flavours. With a smooth spread and a deep creamy finish, it brings comfort and richness to every bite.', nextDeliveryDate: '2026-09-08', imageLabel: 'Buffalo Butter', imageFile: 'buffalobutter-removebg-preview.png', nutritionBenefits: butterNutrition },
  { id: 'cow-butter', name: 'Cow Butter', size: '200 g', category: 'Butter', price: 120, mrp: 140, tags: ['Smooth', 'Fresh'], description: 'Fresh, smooth cow butter with a rich finish and creamy texture. A daily essential for cooking, baking and simple toppings that taste wholesome and home-made.', nextDeliveryDate: '2026-09-08', imageLabel: 'Cow Butter', imageFile: 'cowbutter-removebg-preview.png', nutritionBenefits: butterNutrition },
];
export const subscription: Subscription = { id: 'sub1', productId: 'buffalo', planTier: 'Family', quantityPerDelivery: 1, frequency: 'Daily', timeSlot: 'Morning', startDate: '2026-09-08', durationType: 'Ongoing', status: 'Active', deliveryAddressId: 'home', paymentMethod: 'UPI · ananya@okbank', skippedDates: [], nextDeliveryDate: '2026-09-08', createdDate: '2026-08-01' };
export const orders: Order[] = [
  { id: 'FP-20260906-114', date: '2026-09-06', items: [{ productId: 'cow', name: 'Cow Milk 500 ml', quantity: 1, price: 58 }, { productId: 'curd', name: 'Curd 400 g', quantity: 1, price: 37 }], itemTotal: 95, deliveryFee: 0, walletUsed: 0, totalPaid: 95, status: 'Delivered', deliveryAddress: address.line1 + ', ' + address.city },
  { id: 'FP-20260905-102', date: '2026-09-05', items: [{ productId: 'buffalo', name: 'Buffalo Milk 1 L', quantity: 1, price: 72 }], itemTotal: 72, deliveryFee: 0, walletUsed: 0, totalPaid: 72, status: 'Delivered', deliveryAddress: address.line1 + ', ' + address.city },
  { id: 'FP-20260908-119', date: '2026-09-08', items: [{ productId: 'buffalo', name: 'A2 Milk 500 ml', quantity: 2, price: 110 }], itemTotal: 110, deliveryFee: 0, walletUsed: 0, totalPaid: 110, status: 'Upcoming', deliveryAddress: address.line1 + ', ' + address.city },
  { id: 'FP-20260904-098', date: '2026-09-04', items: [{ productId: 'buffalo', name: 'A2 Milk 500 ml', quantity: 2, price: 220 }], itemTotal: 310, deliveryFee: 0, walletUsed: 0, totalPaid: 310, status: 'Cancelled', deliveryAddress: address.line1 + ', ' + address.city },
];
export const notifications: Notification[] = [
  { id: 'n1', type: 'delivery', title: 'Your order has been delivered', body: 'Cow Milk 500ml, Curd 400g · Delivered at 6:45 AM', timestamp: '2h ago', isRead: false },
  { id: 'n2', type: 'wallet', title: 'Wallet credited with ₹50', body: 'Cashback for your last order', timestamp: '5h ago', isRead: false },
  { id: 'n3', type: 'promo', title: 'New: Flavoured Milk now available', body: 'Try our new Chocolate and Strawberry flavoured milk.', timestamp: 'Yesterday', isRead: true },
  { id: 'n4', type: 'skip', title: 'Delivery skipped', body: 'Your delivery for 4 Sep was skipped as requested', timestamp: '2 days ago', isRead: true },
  { id: 'n5', type: 'renewal', title: 'Subscription renewed', body: 'Your A2 Buffalo Milk subscription has been renewed', timestamp: '3 days ago', isRead: true },
];
export const transactions: WalletTransaction[] = [
  { id: 't1', type: 'top-up', title: 'Wallet Top-up', timestamp: '6 Sep 2026, 10:12 AM', amount: 200, direction: 'credit' },
  { id: 't2', type: 'payment', title: 'Order Payment · #FP-2026', timestamp: '6 Sep 2026, 8:12 PM', amount: 95, direction: 'debit' },
  { id: 't3', type: 'cashback', title: 'Cashback Credited', timestamp: '5 Sep 2026, 6:00 AM', amount: 50, direction: 'credit' },
  { id: 't4', type: 'payment', title: 'Order Payment · #FP-2', timestamp: '5 Sep 2026, 7:05 PM', amount: 72, direction: 'debit' },
];
export const invoice: Invoice = { id: 'INV-20260906-114', orderId: 'FP-20260906-114', gstin: '29AAFCP1234B1Z5', sellerName: 'Fresh & Pure', billedTo: 'Ananya Rao', lineItems: [{ name: 'Cow Milk 500ml', quantity: 1, rate: 58, amount: 58 }, { name: 'Curd 400g', quantity: 1, rate: 37, amount: 37 }], subtotal: 95, cgst: 0, sgst: 0, total: 95, paymentMode: 'Wallet/UPI', dateGenerated: '6 Sep 2026' };
