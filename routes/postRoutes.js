import express from 'express';
import { getAllPosts, getPostById, getCommentsByPostId, createPost, createComment, deletePost, deleteComment, updatePost, updateComment } from '../controllers/postController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// router.get('/page/:page', getAllPosts);
// router.get('/:postId', getPostById);
// router.get('/:post_id/comments', getCommentsByPostId);
// router.post('/', upload.single('image'), createPost);
// router.post('/:post_id/comments', createComment);
// router.delete('/:postId', deletePost);
// router.delete('/:post_id/comments/:comment_id', deleteComment);
// router.patch('/:postId', upload.single('image'), updatePost);
// router.patch('/:postId/comments/:commentId', updateComment);

router.get('/:post_id/comments', getCommentsByPostId);
router.get('/page/:page', getAllPosts);
router.get('/:postId', getPostById);

router.post('/:post_id/comments', createComment);
router.post('/', upload.single('image'), createPost);

router.patch('/:postId/comments/:commentId', updateComment);
router.patch('/:postId', upload.single('image'), updatePost);

router.delete('/:post_id/comments/:comment_id', deleteComment); 
router.delete('/:postId', deletePost);


export default router;
