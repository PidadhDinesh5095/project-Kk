// kafka/topics.js
import { TOPICS } from './constants.js';

// -1 = use the cluster's default replication factor.
const REPLICATION_FACTOR = Number(process.env.KAFKA_REPLICATION_FACTOR || -1);

export const topicConfigs = [
  {
    topic: TOPICS.NOTIFICATION_EVENTS,
    numPartitions: 6,
    replicationFactor: REPLICATION_FACTOR,
    configEntries: [
      { name: 'retention.ms', value: `${7 * 24 * 60 * 60 * 1000}` }, // 7 days
      { name: 'cleanup.policy', value: 'delete' },
    ],
  },
  {
    topic: TOPICS.NOTIFICATION_DLQ,
    numPartitions: 3,
    replicationFactor: REPLICATION_FACTOR,
    configEntries: [{ name: 'retention.ms', value: `${14 * 24 * 60 * 60 * 1000}` }], // 14 days
  },
];

export default topicConfigs;
