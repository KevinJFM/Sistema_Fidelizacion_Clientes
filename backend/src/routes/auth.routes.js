import { Router } from 'express';
import { loginUser, registerUser, refreshToken, logoutUser } from '../controllers/auth.controller.js';
import { loginLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

router.post('/login', loginLimiter, loginUser);
router.post('/register', registerUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;
