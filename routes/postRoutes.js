import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost } from '../controllers/postController.js';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/:postId', getPostById);
router.get('/:post_id/comments', getCommentsByPostId);
router.post('/', createPost);

export default router;
