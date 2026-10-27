// kafka/index.js
import { ensureTopics } from './admin.js';
import { connectProducer, disconnectProducer, publishEvent, publishEvents, emitEvent, emitEvents } from './producer.js';
import { startConsumer, stopConsumer } from './consumer.js';
import { EVENT_TYPES, TOPICS } from './constants.js';

export const startKafka = async () => {
  await ensureTopics();
  await connectProducer();
  await startConsumer();
  console.log('[kafka] notification service started');
};

export const stopKafka = async () => {
  await stopConsumer();
  await disconnectProducer();
  console.log('[kafka] notification service stopped');
};

process.on('SIGTERM', async () => {
  await stopKafka();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await stopKafka();
  process.exit(0);
});

export { publishEvent, publishEvents, emitEvent, emitEvents, EVENT_TYPES, TOPICS };
export default startKafka;
