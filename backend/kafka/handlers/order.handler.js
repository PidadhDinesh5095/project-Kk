// kafka/handlers/order.handler.js
import { EVENT_TYPES } from '../constants.js';
import { notify, rupees } from '../notify.js';

const FROM = 'orders@dineshfarms.app';
const orderData = (orderId) => ({ screen: 'OrderDetails', orderId });

const handleConfirmed = async ({ userId, orderId, productName, totalAmount, deliveryDate }) => {
  const when = deliveryDate ? new Date(deliveryDate).toDateString() : null;
  await notify(userId, {
    type: 'ORDER_CONFIRMED',
    title: 'Order confirmed',
    body: `${productName} is confirmed${when ? ` for ${when}` : ''}.`,
    data: orderData(orderId),
    email: {
      from: FROM,
      subject: `Order Confirmed — ${orderId}`,
      html: `<p>Your order for <b>${productName}</b> is confirmed${when ? `, scheduled for ${when}` : ''}.</p>
             <p>Total: ${rupees(totalAmount)}</p><p>Order ID: ${orderId}</p>`,
    },
  });
};

// One topic, many causes: branch on cancelledBy.
const CANCEL_REASONS = {
  USER: 'You cancelled this order.',
  SYSTEM_NO_STOCK: 'It was cancelled because the item is out of stock. Any payment will be refunded.',
  SUBSCRIPTION_PAUSED: 'It was cancelled because your subscription was paused.',
};

const handleCancelled = async ({ userId, orderId, productName, cancelledBy = 'SYSTEM' }) => {
  const reason = CANCEL_REASONS[cancelledBy] || 'The order was cancelled.';
  await notify(userId, {
    type: 'ORDER_CANCELLED',
    title: 'Order cancelled',
    body: `${productName ? `${productName}: ` : ''}${reason}`,
    data: orderData(orderId),
    email: {
      from: FROM,
      subject: `Order Cancelled — ${orderId}`,
      html: `<p>Order ${orderId}${productName ? ` (${productName})` : ''} was cancelled.</p><p>${reason}</p>`,
    },
  });
};

const handleOutForDelivery = async ({ userId, orderId, productName }) => {
  await notify(userId, {
    type: 'ORDER_OUT_FOR_DELIVERY',
    title: 'Out for delivery',
    body: `${productName || 'Your order'} is on its way.`,
    data: orderData(orderId),
  });
};

const handleDelivered = async ({ userId, orderId, productName }) => {
  await notify(userId, {
    type: 'ORDER_DELIVERED',
    title: 'Delivered',
    body: `${productName || 'Your order'} has been delivered. Enjoy!`,
    data: orderData(orderId),
  });
};

const handleDeliveryFailed = async ({ userId, orderId, reason }) => {
  await notify(userId, {
    type: 'ORDER_DELIVERY_FAILED',
    title: "We couldn't deliver your order",
    body: reason || 'Our delivery partner could not complete the delivery.',
    data: orderData(orderId),
    email: {
      from: FROM,
      subject: `Delivery Attempt Failed — ${orderId}`,
      html: `<p>We couldn't deliver order ${orderId}.${reason ? ` Reason: ${reason}.` : ''}</p>`,
    },
  });
};

const handlePaymentFailed = async ({ userId, orderId, amount, reason }) => {
  await notify(userId, {
    type: 'ORDER_PAYMENT_FAILED',
    title: 'Payment failed',
    body: `Payment of ${rupees(amount)} for order ${orderId} failed.${reason ? ` ${reason}` : ''}`,
    data: orderData(orderId),
    email: {
      from: FROM,
      subject: `Payment Failed — ${orderId}`,
      html: `<p>Payment of ${rupees(amount)} for order ${orderId} failed.${reason ? ` Reason: ${reason}.` : ''}</p>`,
    },
  });
};

export const orderHandlers = {
  [EVENT_TYPES.ORDER_CONFIRMED]: handleConfirmed,
  [EVENT_TYPES.ORDER_CANCELLED]: handleCancelled,
  [EVENT_TYPES.ORDER_OUT_FOR_DELIVERY]: handleOutForDelivery,
  [EVENT_TYPES.ORDER_DELIVERED]: handleDelivered,
  [EVENT_TYPES.ORDER_DELIVERY_FAILED]: handleDeliveryFailed,
  [EVENT_TYPES.ORDER_PAYMENT_FAILED]: handlePaymentFailed,
};

export default orderHandlers;
