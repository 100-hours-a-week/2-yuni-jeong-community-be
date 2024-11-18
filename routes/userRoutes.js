import express from 'express';
import { updateUserProfile, updatePassword, deleteUserAccount } from '../controllers/userController.js'
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.put('/:userId', isAuthenticated, updateUserProfile);
router.patch('/password', isAuthenticated, updatePassword);
router.delete('/', isAuthenticated, deleteUserAccount);

export default router;