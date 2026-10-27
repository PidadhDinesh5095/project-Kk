// kafka/consumer.js
import kafka from './client.js';
import { TOPICS, KAFKA_GROUP_ID } from './constants.js';
import producer, { connectProducer } from './producer.js';
import withRetry from './retry.js';

import { addressHandlers } from './handlers/address.handler.js';
import { walletHandlers } from './handlers/wallet.handler.js';
import { orderHandlers } from './handlers/order.handler.js';
import { invoiceHandlers } from './handlers/invoice.handler.js';
import { subscriptionHandlers } from './handlers/subscription.handler.js';
import { campaignHandlers } from './handlers/campaign.handler.js';
import { deliveryHandlers } from './handlers/delivery.handler.js';
import { generalHandler } from './handlers/general.handler.js';

const handlerRegistry = {
  ...addressHandlers,
  ...walletHandlers,
  ...orderHandlers,
  ...invoiceHandlers,
  ...subscriptionHandlers,
  ...campaignHandlers,
  ...deliveryHandlers,
};

const consumer = kafka.consumer({
  groupId: KAFKA_GROUP_ID,
  maxInFlightRequests: 1,
  retry: { retries: 5 },
});

const sendToDLQ = async (message, reason) => {
  await connectProducer();
  await producer.send({
    topic: TOPICS.NOTIFICATION_DLQ,
    messages: [{ key: message.key, value: message.value, headers: { ...message.headers, failureReason: String(reason) } }],
  });
};

export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.NOTIFICATION_EVENTS, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const key = message.key?.toString();
      let event;

      try {
        event = JSON.parse(message.value.toString());
      } catch (err) {
        console.error('[kafka:consumer] parse error, sending to DLQ:', err.message);
        return sendToDLQ(message, 'PARSE_ERROR');
      }

      const handler = handlerRegistry[event.type] || generalHandler;

      try {
        await withRetry(() => handler(event.payload, event), { context: `handler:${event.type}:${key}` });
        console.log(`[kafka:consumer] handled ${event.type} key=${key} (partition ${partition})`);
      } catch (err) {
        console.error(`[kafka:consumer] giving up on ${event.type} key=${key}:`, err.message);
        await sendToDLQ(message, err.message);
      }
    },
  });

  console.log('[kafka:consumer] running, subscribed to', TOPICS.NOTIFICATION_EVENTS);
};

export const stopConsumer = async () => {
  await consumer.disconnect();
  console.log('[kafka:consumer] disconnected');
};

export default consumer;
