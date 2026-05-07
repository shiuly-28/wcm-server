import express from 'express';
import { authMiddleware, authorizeRoles } from '../middlewares/auth.js';
import { allEmail, create } from '../controllers/subscriptionEmailsController.js';
const router = express.Router();

router.post('/', create);

router.get('/', authMiddleware, authorizeRoles('admin'), allEmail);

export default router;
