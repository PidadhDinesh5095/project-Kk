// kafka/handlers/subscription.handler.js
import { EVENT_TYPES } from '../constants.js';
import { notify } from '../notify.js';

const FROM = 'orders@dineshfarms.app';
const data = { screen: 'Subscriptions' };

const handleCreated = async ({ userId, subscriptionId, productName, frequency }) => {
  await notify(userId, {
    type: 'SUBSCRIPTION_CREATED',
    title: 'Subscription active',
    body: `Your ${frequency} subscription for ${productName} is now active.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
    email: {
      from: FROM,
      subject: `Subscription Confirmed — ${productName}`,
      html: `<p>Your <b>${frequency}</b> subscription for ${productName} is now active.</p>`,
    },
  });
};

const handlePaused = async ({ userId, subscriptionId, productName }) => {
  await notify(userId, {
    type: 'SUBSCRIPTION_PAUSED',
    title: 'Subscription paused',
    body: `${productName || 'Your subscription'} deliveries are paused until you resume.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
  });
};

const handleResumed = async ({ userId, subscriptionId, productName }) => {
  await notify(userId, {
    type: 'SUBSCRIPTION_RESUMED',
    title: 'Subscription resumed',
    body: `${productName || 'Your subscription'} deliveries will continue as scheduled.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
  });
};

const handleScheduleUpdated = async ({ userId, subscriptionId, productName }) => {
  await notify(userId, {
    type: 'SUBSCRIPTION_SCHEDULE_UPDATED',
    title: 'Subscription updated',
    body: `The schedule for ${productName || 'your subscription'} has been updated.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
  });
};

const handleDatesSkipped = async ({ userId, subscriptionId, productName, dates = [] }) => {
  const list = dates.map((d) => new Date(d).toDateString()).join(', ');
  await notify(userId, {
    type: 'SUBSCRIPTION_DATES_SKIPPED',
    title: 'Deliveries skipped',
    body: `${productName || 'Your subscription'}: skipped ${list || 'the selected dates'}.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
  });
};

const handleDeliveryDatesPaused = async ({ userId, dates = [] }) => {
  const list = dates.map((date) => new Date(date).toDateString()).join(', ');
  await notify(userId, {
    type: 'DELIVERY_DATES_PAUSED',
    title: 'Deliveries paused',
    body: `Deliveries are paused for ${list || 'the selected dates'}.`,
    data,
  });
};

const handleCancelled = async ({ userId, subscriptionId, productName }) => {
  const name = productName || 'your selected product';
  await notify(userId, {
    type: 'SUBSCRIPTION_CANCELLED',
    title: 'Subscription cancelled',
    body: `Your subscription for ${name} has been cancelled.`,
    data: { ...data, subscriptionId },
    referenceId: subscriptionId,
    email: {
      from: FROM,
      subject: `Subscription Cancelled — ${name}`,
      html: `<p>Your subscription for <b>${name}</b> has been cancelled.</p>`,
    },
  });
};

export const subscriptionHandlers = {
  [EVENT_TYPES.SUBSCRIPTION_CREATED]: handleCreated,
  [EVENT_TYPES.SUBSCRIPTION_PAUSED]: handlePaused,
  [EVENT_TYPES.SUBSCRIPTION_RESUMED]: handleResumed,
  [EVENT_TYPES.SUBSCRIPTION_SCHEDULE_UPDATED]: handleScheduleUpdated,
  [EVENT_TYPES.SUBSCRIPTION_DATES_SKIPPED]: handleDatesSkipped,
  [EVENT_TYPES.SUBSCRIPTION_CANCELLED]: handleCancelled,
  [EVENT_TYPES.DELIVERY_DATES_PAUSED]: handleDeliveryDatesPaused,
};

export default subscriptionHandlers;
