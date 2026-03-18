import express from 'express';
import rateLimit from 'express-rate-limit';
import { login_user, logout_user } from '../../controllers/login/auth.controller.js';
import { refreshAccessToken } from '../../controllers/refreshToken/refreshToken.controllers.js';

const router = express.Router();

// Límite estricto para login: evita fuerza bruta sin bloquear de más a usuarios válidos.
const login_limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        const resetTime = req.rateLimit?.resetTime instanceof Date
            ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 60000))
            : 15;

        return res.status(429).json({
            success: false,
            message: `Demasiados intentos de inicio de sesión. Esperá ${resetTime} minuto(s) antes de volver a intentar.`
        });
    }
});

// Límite más permisivo para refresh para no romper la sesión por múltiples tabs/reintentos.
const refresh_limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiadas solicitudes de refresh. Intentá nuevamente en unos minutos.'
    }
});

router.post('/login', login_limiter, login_user);
router.post('/logout', logout_user);
router.post('/refresh-token', refresh_limiter, refreshAccessToken);

export default router;
