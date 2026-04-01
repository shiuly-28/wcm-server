import express from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController.js';
import { createComment, getBlogComments, deleteComment } from '../controllers/commentController.js';
import { authMiddleware, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

// --- Blog Routes ---
router.get('/', getAllBlogs); // public
router.get('/:id', getBlogById); // public

// Admin blog management routes
router.post('/', authMiddleware, authorizeRoles('admin'), createBlog);
router.put('/:id', authMiddleware, authorizeRoles('admin'), updateBlog);
router.delete('/:id', authMiddleware, authorizeRoles('admin'), deleteBlog);

// --- Comment Routes ---
router.get('/:blogId/comments', getBlogComments); // public
router.post('/comments', authMiddleware, createComment); 
router.delete('/comments/:id', authMiddleware, deleteComment); 

export default router;
