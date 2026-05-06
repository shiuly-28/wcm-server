import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import cors from 'cors';
import { globalLimiter } from './utils/rateLimiter.js';

import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import creatorRoutes from './routes/creatorRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import sliderRoutes from './routes/sliderRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import viewsRoutes from './routes/viewsRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import footerRoutes from './routes/footerRoutes.js';
import logRoutes from './routes/logRoutes.js';
import { logger } from './utils/logger.js';
import emailRoutes from "./routes/subscriptionEmails.js"

const app = express();
app.set('trust proxy', 1);

const __dirname = path.resolve();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  })
);

app.use(cookieParser());

app.use(globalLimiter);

app.use('/api/payments', paymentRoutes);

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/views', viewsRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/footer', footerRoutes);
app.use('/api/emails', emailRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/monitoring', logRoutes);

app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.get('/', (req, res) => {
  res.send('Server is running....');
});

export default app;