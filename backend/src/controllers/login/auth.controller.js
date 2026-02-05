import connection from '../../db/db.connection.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/pino/logger.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const loginUser = async (req, res) => {
    const start = Date.now();
    logger.info('Iniciando petición de login...');

    const { email, password } = req.body;

    // Validar solo que los campos no estén vacíos
    if (!email || !password) {
        logger.warn({ event: 'login_invalid_input' }, 'Intento de login sin usuario o password');
        return res.status(400).json({
            success: false,
            message: 'Usuario y contraseña son obligatorios.'
        });
    }

    try {
        // CORRECCIÓN 1: Usamos los nombres en ESPAÑOL de tu tabla
        const user = await connection('usuarios') // Nombre correcto de tabla
            .select('id', 'nombre', 'email', 'password', 'activo', 'created_at')
            .where({ email })
            .first();

        // 1️⃣ Si el usuario NO existe → credenciales inválidas
        if (!user) {
            logger.warn({ event: 'login_failed', email }, 'Credenciales inválidas');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }

        // Si el usuario está inactivo
        if (!user.activo) {
            logger.warn({ event: 'login_inactive_user', email }, 'Intento de login usuario inactivo');
            return res.status(403).json({
                success: false,
                message: 'Usuario inactivo. Contacta al administrador.'
            });
        }

        // 3️⃣ Si la contraseña es incorrecta
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            logger.warn({ event: 'login_failed', email }, 'Credenciales inválidas');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas.'
            });
        }


        // --- Generación de Tokens ---
        const payload = { userId: user.id };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        await connection('refreshTokens').insert({
            user_id: user.id,
            token_hash: tokenHash,
            expires_at: expirationDate
        });

        // Cookie HttpOnly (mejor config de seguridad)
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60 * 1000 // 15 min
        });

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.nombre,
                    email: user.email
                }
            }
        });
        const duration = Date.now() - start;
        logger.info({ event: 'login_success', userId: user.id, userName: user.nombre, duration: `${duration}ms` }, 'Login exitoso');

    } catch (error) {
        logger.error({ event: 'login_error', error: error.message }, 'Error crítico en login');
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

export const logoutUser = async (req, res) => {
    const start = Date.now();
    logger.info('Iniciando petición de logout...');

    const refreshToken = req.cookies.refreshToken;

    // Validación: Si no hay cookie, quizás ya se deslogueó antes
    if (!refreshToken) {
        res.clearCookie('refreshToken');
        return res.status(200).json({ success: true, message: 'Sesión cerrada.' });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await connection('refreshTokens').where({ token_hash: tokenHash }).del();

        // 2. CAMBIO CRUCIAL: Borramos la cookie del navegador del usuario
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.status(200).json({ success: true, message: 'Logout exitoso.' });

        const duration = Date.now() - start;
        logger.info({ event: 'logout_success', duration: `${duration}ms` }, 'Logout exitoso');

    } catch (error) {
        logger.error({ event: 'logout_error', error: error.message }, 'Error crítico en logout');
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
}; 