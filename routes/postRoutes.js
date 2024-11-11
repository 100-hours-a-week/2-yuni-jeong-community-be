import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost, createComment, deletePost, deleteComment } from '../controllers/postController.js';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/:postId', getPostById);
router.get('/:post_id/comments', getCommentsByPostId);
router.post('/', createPost);
router.post('/:post_id/comments', createComment);
router.delete('/:postId', deletePost);
router.delete('/:post_id/comments/:comment_id', deleteComment);

export default router;
