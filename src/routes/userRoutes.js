import express from 'express';
import upload from '../config/multer.js';
import {
  registerUser,
  loginUser,
  becomeCreator,
  getMyProfile,
  logoutUser,
  updateUserProfile,
  updateCreatorProfile,
} from '../controllers/userController.js';
import { authMiddleware, authorizeRoles } from '../middlewares/auth.js'; 

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

router.get('/me', authMiddleware, getMyProfile);

router.put('/update-profile', authMiddleware, updateUserProfile);

router.put(
  '/update-creator-profile',
  authMiddleware,
  authorizeRoles('creator'), 
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  updateCreatorProfile
);

router.post(
  '/become-creator',
  authMiddleware,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  becomeCreator
);

export default router;
