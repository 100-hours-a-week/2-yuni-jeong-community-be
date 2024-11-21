import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost, createComment, deletePost, deleteComment, updatePost, updateComment, toggleLike } from '../controllers/postController.js';
import upload from '../middleware/upload.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/:post_id/comments', getCommentsByPostId);
router.get('/page/:page', getAllPosts);
router.get('/:post_id', getPostById);

router.post('/:post_id/comments', createComment);
router.post('/', upload.single('image'), createPost);
router.post('/:post_id/like', isAuthenticated, toggleLike);

router.patch('/:post_id/comments/:comment_id', updateComment);
router.patch('/:post_id', upload.single('image'), updatePost);

router.delete('/:post_id/comments/:comment_id', deleteComment); 
router.delete('/:post_id', deletePost);


export default router;
