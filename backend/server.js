import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { startScheduler } from './job.js';


import { connectRedis } from './config/redis.js';
import {connectDb} from './db/pool.js';
// ...


import __cjsModule586 from './middleware/rateLimiter.middleware.js';
const { generalLimiter } = __cjsModule586;
import errorHandler from './middleware/errorHandler.middleware.js';
import __cjsModule587 from './socket/socket.js';
const { initSocket } = __cjsModule587;
import startConsumer from './kafka/consumer.js';
import __cjsModule588 from './utils/otpService.js';
const { cleanupExpiredOtps } = __cjsModule588;

import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();
const httpServer = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment-methods', paymentRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use(errorHandler);

initSocket(httpServer);
await connectDb(); // Connect to Postgres

await connectRedis(); // Connect to Upstash Redis
startScheduler();

// startConsumer().catch((err) => {
//   console.error('[kafka] consumer failed to start — emails/push notifications will not be processed', err);
// });
// startScheduler() runs subscription deliveries at 22:00 and 13:00 IST.






// Postgres has no TTL index like Mongo — sweep expired OTP rows periodically.
setInterval(() => {
  cleanupExpiredOtps().catch((err) => console.error('[otp] cleanup failed', err));
}, 10 * 60 * 1000); // every 10 minutes

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Dinesh Farms API running on port ${PORT}`));
