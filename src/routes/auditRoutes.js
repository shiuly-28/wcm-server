import express from 'express';
const router = express.Router();
import { getAdminAuditLogs, getCreatorAuditLogs } from '../controllers/auditController.js';
import { authMiddleware, authorizeRoles } from '../middlewares/auth.js';

// --- Creator Routes ---
// ক্রিয়েটর তার নিজস্ব লিস্টিং বা পেমেন্ট সম্পর্কিত অ্যাকশন লগ দেখতে পারবে
router.get('/creator/logs', authMiddleware, getCreatorAuditLogs);

// --- Admin Routes ---
// অ্যাডমিন পুরো সিস্টেমের সব ইউজারের অ্যাকশন লগ দেখতে পারবে
router.get('/admin/logs', authMiddleware, authorizeRoles('admin'), getAdminAuditLogs);

export default router;
