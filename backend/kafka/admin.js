// kafka/admin.js
import kafka from './client.js';
import topicConfigs from './topics.js';

export const ensureTopics = async () => {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    const toCreate = topicConfigs.filter((t) => !existing.includes(t.topic));

    if (toCreate.length) {
      await admin.createTopics({ waitForLeaders: true, topics: toCreate });
      console.log(`[kafka:admin] Created topics: ${toCreate.map((t) => t.topic).join(', ')}`);
    } else {
      console.log('[kafka:admin] All required topics already exist.');
    }
  } finally {
    await admin.disconnect();
  }
};

export default ensureTopics;
