// kafka/producer.js
import kafka from './client.js';
import { Partitioners } from 'kafkajs';
import { TOPICS } from './constants.js';
import withRetry from './retry.js';

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true, // no duplicate events on producer retry
  createPartitioner: Partitioners.LegacyPartitioner,
  retry: { retries: Number.MAX_SAFE_INTEGER },
});

let isConnected = false;

export const connectProducer = async () => {
  if (isConnected) return;
  await producer.connect();
  isConnected = true;
  console.log('[kafka:producer] connected');
};

export const disconnectProducer = async () => {
  if (!isConnected) return;
  await producer.disconnect();
  isConnected = false;
  console.log('[kafka:producer] disconnected');
};

const toMessage = (type, key, payload) => ({
  key: String(key),
  value: JSON.stringify({ type, payload, producedAt: new Date().toISOString() }),
  headers: { eventType: type },
});

/**
 * Publish several events for the SAME user in ONE Kafka send.
 * Same key -> same partition -> ordered, and the batch is a single request.
 */
export const publishEvents = async (key, events) => {
  if (key === undefined || key === null || key === '') {
    throw new Error('[kafka:producer] key (userId) is required');
  }
  await connectProducer();
  return withRetry(
    () =>
      producer.send({
        topic: TOPICS.NOTIFICATION_EVENTS,
        messages: events.map((e) => toMessage(e.type, key, e.payload)),
      }),
    { context: `publish:${events.map((e) => e.type).join(',')}` }
  );
};

/**
 * @param {string} type    one of EVENT_TYPES
 * @param {string} key     MUST be the userId
 * @param {object} payload data the handler needs (must include userId)
 */
export const publishEvent = (type, key, payload) => publishEvents(key, [{ type, payload }]);

/**
 * Fire-and-forget version for controllers: never throws, never blocks the
 * API response. Use inside request handlers: `emitEvent(...)` (no await).
 */
export const emitEvent = (type, key, payload) => {
  publishEvent(type, key, payload).catch((err) =>
    console.error(`[kafka:producer] emitEvent(${type}) failed:`, err.message)
  );
};

export const emitEvents = (key, events) => {
  if (events.length === 0) return;
  publishEvents(key, events).catch((err) =>
    console.error(`[kafka:producer] emitEvents(${events.map((event) => event.type).join(',')}) failed:`, err.message)
  );
};

export default producer;
