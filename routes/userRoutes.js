import express from 'express';
import { updateUserProfile, updatePassword, deleteUserAccount } from '../controllers/userController.js'
import { isAuthenticated } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.patch('/password', isAuthenticated, updatePassword);
router.patch('/:userId', upload.single('profile_image'), isAuthenticated, updateUserProfile);
router.delete('/', isAuthenticated, deleteUserAccount);

export default router;