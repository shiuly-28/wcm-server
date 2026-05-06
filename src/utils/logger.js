// utils/logger.js
import AuditLog from '../models/AuditLog.js';
import winston from 'winston';
import path from 'path';

export const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: path.join(process.cwd(), 'logs/error.log') }),
    new winston.transports.Console(),
  ],
});

export const createAuditLog = async ({ req, user, action, targetType, targetId, details }) => {
  try {
    const userId = user || (req?.user ? req.user._id : null);

    if (!userId) {
      console.warn(`[AuditLog Warning] Action "${action}" recorded without a specific User ID.`);
    }

    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0] ||
      req?.ip ||
      req?.connection?.remoteAddress ||
      'system_action';

    await AuditLog.create({
      user: userId,
      action,
      targetType,
      targetId,
      details,
      ipAddress: ip,
    });
  } catch (error) {
    console.error('CRITICAL: Audit Log Failed to Save:', error.message);
  }
};
