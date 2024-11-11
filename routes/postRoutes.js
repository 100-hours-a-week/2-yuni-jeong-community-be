import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost, createComment, deletePost } from '../controllers/postController.js';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/:postId', getPostById);
router.get('/:post_id/comments', getCommentsByPostId);
router.post('/', createPost);
router.post('/:post_id/comments', createComment);
router.delete('/:postId', deletePost);

export default router;
