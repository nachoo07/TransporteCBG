import jwt from 'jsonwebtoken';
import connection from '../../db/db.connection.js'; // Importamos la conexión
import logger from '../../utils/pino/logger.js';    // Importamos el logger

export const verifyToken = async (req, res, next) => {
    // Iniciamos cronómetro para métricas (opcional, pero útil)
    const start = Date.now();

    try {
        const token = req.cookies.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado. No se proporcionó un token.'
            });
        }

        // 3. Verificar firma del token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            logger.warn({ event: 'token_verify_failed', error: jwtError.message }, 'Firma de JWT inválida o expirada');
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado.'
            });
        }

        // 4. CORRECCIÓN CRÍTICA: Validar estado en Base de Datos 🛑
        // Buscamos solo los campos necesarios para ser rápidos
        const user = await connection('usuarios')
            .where({ id: decoded.userId })
            .first();

        // 4.1 Si el usuario fue borrado de la DB
        if (!user) {
            logger.warn({ event: 'user_not_found', userId: decoded.userId }, 'Usuario del token no encontrado en DB');
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado.'
            });
        }

        // 4.2 Si el usuario fue desactivado (activo = 0 o false)
        if (!user.activo) {
            logger.warn({ event: 'user_inactive', userId: decoded.userId, email: user.email }, 'Usuario inactivo intentando acceder');
            return res.status(401).json({
                success: false,
                message: 'Usuario ha sido desactivado. Contacte al administrador.'
            });
        }

        // 5. ¡Éxito! Inyectamos datos frescos en la request
        req.user = {
            id: decoded.userId,
            nombre: user.nombre
        };

        // (Opcional) Log de éxito en nivel debug para no saturar
        // const duration = Date.now() - start;
        // logger.debug({ userId: user.id, duration: `${duration}ms` }, 'Request autenticado');

        next();

    } catch (error) {
        logger.error({
            event: 'auth_middleware_error',
            error: error.message,
            stack: error.stack
        }, 'Error interno en verificación de token');

        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al verificar sesión.'
        });
    }
};
