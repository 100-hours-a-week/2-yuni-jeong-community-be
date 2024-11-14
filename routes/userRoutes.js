import express from 'express';
import { updateUserProfile } from '../controllers/userController.js'
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.put('/:userId', isAuthenticated, updateUserProfile);


export default router;