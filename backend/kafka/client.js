// kafka/client.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Kafka, logLevel } from 'kafkajs';
import {
  KAFKA_CLIENT_ID,
  KAFKA_BROKERS,
  KAFKA_USERNAME,
  KAFKA_PASSWORD,
  KAFKA_SASL_MECHANISM,
  KAFKA_CA_PATH,
} from './constants.js';

if (KAFKA_BROKERS.length === 0) {
  throw new Error(
    '[kafka:client] KAFKA_BROKERS is empty. Set it like "localhost:9092" or "host1:9092,host2:9092", ' +
      'and make sure dotenv loads before any kafka module is imported.'
  );
}

const useSasl = Boolean(KAFKA_USERNAME && KAFKA_PASSWORD);
if (Boolean(KAFKA_USERNAME) !== Boolean(KAFKA_PASSWORD)) {
  throw new Error('[kafka:client] Set both KAFKA_USERNAME and KAFKA_PASSWORD for SASL authentication.');
}
if (!['plain', 'scram-sha-256', 'scram-sha-512'].includes(KAFKA_SASL_MECHANISM)) {
  throw new Error('[kafka:client] KAFKA_SASL_MECHANISM must be plain, scram-sha-256, or scram-sha-512.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadCa = () => {
  if (process.env.KAFKA_CA_BASE64) {
    return [Buffer.from(process.env.KAFKA_CA_BASE64, 'base64').toString('utf-8')];
  }

  const caPath = KAFKA_CA_PATH
    ? path.resolve(KAFKA_CA_PATH)
    : path.join(__dirname, 'certs', 'ca.pem');
  if (fs.existsSync(caPath)) {
    return [fs.readFileSync(caPath, 'utf-8')];
  }

  console.warn(`[kafka:client] CA certificate not found at ${caPath}; TLS to Aiven may fail.`);
  return undefined;
};

const ca = loadCa();
const useTls = useSasl || Boolean(ca);

export const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.INFO,
  ssl: useTls ? { ...(ca ? { ca } : {}), rejectUnauthorized: true } : false,
  sasl: useSasl
    ? { mechanism: KAFKA_SASL_MECHANISM, username: KAFKA_USERNAME, password: KAFKA_PASSWORD }
    : undefined,
  retry: { initialRetryTime: 300, retries: 8 },
});

export default kafka;
