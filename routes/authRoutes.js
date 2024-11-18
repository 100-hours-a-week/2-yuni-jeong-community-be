import express from 'express';
import { getCurrentUser, register, login, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/current', getCurrentUser);
router.post('/signup', register);
router.post('/login', login);
router.post('/logout', logout);

export default router;