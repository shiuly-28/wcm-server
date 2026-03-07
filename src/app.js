import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import cors from 'cors';

import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import creatorRoutes from './routes/creatorRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import { globalLimiter } from './middlewares/rateLimiter.js';

const app = express();
const __dirname = path.resolve();

// ✅ 1. ADD THIS LINE HERE
// This tells Express to trust the proxy headers (X-Forwarded-For)
// to get the correct User IP for the Rate Limiter.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  })
);

app.use(cookieParser());

// 2. Applying Global Limiter to all /api routes
app.use('/api', globalLimiter);

// 3. Payment routes (Handling Stripe Webhook raw body)
app.use('/api/payments', paymentRoutes);

app.use(express.json());

// 4. Other API Routes
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Server is running....');
});

export default app;
