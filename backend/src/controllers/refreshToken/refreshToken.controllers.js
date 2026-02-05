import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import connection from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';

export const refreshAccessToken = async (req, res) => {
    const start = Date.now();
    
    // 1. Obtenemos el token de las cookies
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        logger.warn({ event: 'refresh_no_token' }, 'Intento de refresh sin cookie');
        return res.status(401).json({ success: false, message: 'No hay sesión activa.' });
    }

    try {
        // 2. Buscamos el token en la base de datos (por hash)
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        const savedToken = await connection('refreshTokens')
            .where({ token_hash: tokenHash })
            .first();

        // Si no existe el token en BD (o ya fue usado/borrado)
        if (!savedToken) {
            logger.warn({ event: 'refresh_invalid_hash' }, 'Token de refresh inválido o reutilizado');
            // Por seguridad, limpiamos la cookie del usuario
            res.clearCookie('refreshToken');
            return res.status(403).json({ success: false, message: 'Sesión inválida.' });
        }

        // 3. Verificamos si ya expiró la fecha
        const now = new Date();
        if (savedToken.expires_at < now) {
            logger.info({ event: 'refresh_expired', userId: savedToken.user_id }, 'Token de refresh vencido');
            // Limpieza: borramos el token vencido
            await connection('refreshTokens').where({ id: savedToken.id }).del();
            res.clearCookie('refreshToken');
            return res.status(403).json({ 
                success: false, 
                message: 'Sesión expirada. Por favor inicie sesión nuevamente.' 
            });
        }

        // --- CORRECCIÓN C: VALIDACIÓN DE USUARIO ACTIVO ---
        
        // Buscamos al dueño del token para ver si sigue activo
        const user = await connection('usuarios')
            .select('id', 'email', 'activo')
            .where({ id: savedToken.user_id })
            .first();

        // Casos de seguridad crítica:
        if (!user || !user.activo) {
            logger.warn({ 
                event: 'refresh_user_inactive', 
                userId: savedToken.user_id 
            }, 'Usuario inactivo o eliminado intentó renovar sesión');

            // 🛑 Acción de bloqueo inmediato:
            // 1. Borramos el refresh token de la BD para que no sirva más
            await connection('refreshTokens').where({ id: savedToken.id }).del();
            // 2. Limpiamos la cookie
            res.clearCookie('refreshToken');
            
            return res.status(403).json({ 
                success: false, 
                message: 'Usuario desactivado. Acceso denegado.' 
            });
        }
        
        // --------------------------------------------------

        // 4. Verificación de integridad del JWT (firma)
        try {
            jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            logger.error({ event: 'refresh_jwt_error', error: err.message }, 'Firma de token corrupta');
            return res.status(403).json({ success: false, message: 'Token corrupto.' });
        }

        // 5. Rotación: Generamos NUEVOS tokens
        const payload = { id: user.id, email: user.email };
        
        // Access Token (vida corta)
        const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        
        // Refresh Token (vida larga)
        const newRefreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Calculamos el nuevo hash
        const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        const newExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Actualizamos la BD (reemplazamos el viejo por el nuevo)
        await connection('refreshTokens')
            .where({ id: savedToken.id })
            .update({ 
                token_hash: newTokenHash, 
                expires_at: newExpiration, 
                updated_at: new Date() 
            });

        // 6. Enviamos la nueva cookie
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const duration = Date.now() - start;
        logger.info({ event: 'refresh_success', userId: user.id, duration: `${duration}ms` }, 'Sesión renovada correctamente');

        // 7. Retornamos el Access Token para que el frontend lo use en memoria
        return res.status(200).json({ success: true, accessToken: newAccessToken });

    } catch (error) {
        logger.error({ event: 'refresh_server_error', error: error.message }, 'Error crítico en refresh token');
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};