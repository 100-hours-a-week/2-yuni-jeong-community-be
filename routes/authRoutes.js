import express from 'express';
import { getCurrentUser, register, login, logout } from '../controllers/authController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/current', getCurrentUser);
router.post('/signup', upload.single('profile_image'), register);
router.post('/login', login);
router.post('/logout', logout);

export default router;