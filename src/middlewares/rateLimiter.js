import rateLimit from 'express-rate-limit';

// 1. Global Limiter: Increased max requests to avoid blocking during development
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 500 to 1000
  message: {
    message: 'System: Global request limit reached. Please wait 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip limiter for local development if needed
  skip: (req) =>
    req.ip === '::1' || (req.ip === '127.0.0.1' && process.env.NODE_ENV === 'development'),
});

// 2. Auth Limiter: Increased attempts to 20 per hour
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 10 to 20 for easier testing
  message: {
    message: 'Security: Too many authentication attempts. Try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Tracking Limiter: Adjusted for PPC and Views
export const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Increased from 5 to 15 to allow normal browsing/refreshing
  message: {
    message: 'Activity: High frequency detected. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // This ensures that if the DB check (InteractionLog) rejects a click,
  // the rate limiter doesn't punish the IP as harshly.
  skipFailedRequests: true,
});
