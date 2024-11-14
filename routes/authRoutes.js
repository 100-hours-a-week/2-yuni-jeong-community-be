import express from 'express';
import { getCurrentUser, register, login } from '../controllers/authController.js';

const router = express.Router();

router.get('/current', getCurrentUser);
router.post('/signup', register);
router.post('/login', login);

export default router;