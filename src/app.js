import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import cors from 'cors';

import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/admin', adminRoutes);

export default app;
