import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost, createComment, deletePost, deleteComment, updatePost, updateComment, toggleLike } from '../controllers/postController.js';
import upload from '../middleware/upload.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/:post_id/comments', getCommentsByPostId);
router.get('/page/:page', getAllPosts);
router.get('/:post_id', getPostById);

router.post('/:post_id/comments', isAuthenticated, createComment);
router.post('/', upload.single('image'), isAuthenticated, createPost);
router.post('/:post_id/like', isAuthenticated, toggleLike);

router.patch('/:post_id/comments/:comment_id', isAuthenticated, updateComment);
router.patch('/:post_id', upload.single('image'), isAuthenticated, updatePost);

router.delete('/:post_id/comments/:comment_id', isAuthenticated, deleteComment); 
router.delete('/:post_id', isAuthenticated, deletePost);


export default router;
