import express from 'express';
import {
  getAllUsers,
  getCreatorRequests,
  approveCreator,
  rejectCreator,
  toggleUserStatus,
  manageListings,
  updateListingStatus,
} from '../controllers/adminController.js';
import { authMiddleware, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.get('/creator-requests', getCreatorRequests);
router.put('/approve-creator/:userId', approveCreator);
router.put('/reject-creator/:userId', rejectCreator);
router.put('/update-status/:id', updateListingStatus);
router.put('/toggle-status/:userId', toggleUserStatus);
router.get('/listings', manageListings);

export default router;
