import express from 'express';
import rateLimit from 'express-rate-limit';
import { loginUser, logoutUser } from '../../controllers/login/auth.controller.js';
import { refreshAccessToken } from '../../controllers/refreshToken/refreshToken.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import logger from '../../utils/pino/logger.js';
import { verifyToken } from '../../middlewares/login/auth.middlewares.js';

const router = express.Router();

// Rate limiter para endpoints sensibles
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos por ventana
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/login', authLimiter, loginUser);
router.post('/logout', logoutUser);
router.post('/refresh-token', authLimiter, refreshAccessToken);

export default router;
