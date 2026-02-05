import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { loginUser, logoutUser } from '../../controllers/login/auth.controller.js';
import { refreshAccessToken } from '../../controllers/refreshToken/refreshToken.controllers.js';
import { upload } from '../../../files/cloudinary.js';
import logger from '../../utils/pino/logger.js';

const router = express.Router();

// Seguridad básica
router.use(helmet());

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

// RUTA DE PRUEBA MEJORADA CON LOGS
router.post('/upload-test', (req, res) => {
    logger.info('Petición recibida en /upload-test');

    // Definimos el middleware de subida
    const uploadMiddleware = upload.single('archivo');

    // Ejecutamos el middleware manualmente para capturar errores
    uploadMiddleware(req, res, (err) => {
        if (err) {
            // AQUÍ ATRAPAMOS EL ERROR REAL
            logger.error({ error: err }, 'Error en subida Multer/Cloudinary');
            // Devolvemos el mensaje exacto del error al Postman
            return res.status(500).json({ 
                success: false, 
                errorType: 'Upload Error',
                message: 'Error al procesar la subida de archivos.',
                detail: err.message 
            });
        }

        // Si no hubo error, seguimos:
        if (!req.file) {
            logger.warn('No se recibió archivo en la petición /upload-test');
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo.' });
        }

        logger.info({ path: req.file.path }, 'Archivo subido correctamente en /upload-test');

        res.json({
            success: true,
            message: 'Archivo subido correctamente a Cloudinary',
            url: req.file.path,
            nombreOriginal: req.file.originalname
        });
    });
});

export default router;