import connection from '../../db/db.connection.js';
import bcrypt from 'bcrypt';
import logger from '../../utils/pino/logger.js';

export const getUsers = async (req, res) => {
    // 1. Iniciamos un timer para medir performance (muy pro)
    const start = Date.now(); 
    logger.info('Iniciando petición para obtener usuarios...');

    try {
        const users = await connection('usuarios')
            .select(
                'id', 
                'nombre', 
                'apellido', 
                'email', 
                'activo', 
                'created_at'
            );

        // 3. Calculamos duración
        const duration = Date.now() - start;

        // 4. Logueamos el éxito con contexto (metadata)
        logger.info({ 
            event: 'get_users_success', 
            count: users.length, 
            duration: `${duration}ms` 
        }, 'Usuarios obtenidos correctamente');

        // 5. Respuesta Estandarizada (JSON Envelope)
        res.status(200).json({
            success: true,
            data: users,
            meta: {
                total: users.length,
                timestamp: new Date()
            }
        });

    } catch (error) {
        // 6. Logueamos el error REAL para nosotros (con el stack trace)
        logger.error({ 
            event: 'get_users_error', 
            error: error.message, 
            stack: error.stack 
        }, 'Error crítico al obtener usuarios');

        // 7. Al usuario le devolvemos un error genérico (seguridad)
        res.status(500).json({ 
            success: false, 
            message: 'Hubo un problema al procesar su solicitud. Contacte a soporte.' 
        });
    }
};

export const createUser = async (req, res) => {
    const start = Date.now(); 
    logger.info('Iniciando petición para crear un nuevo usuario...');

    // Los datos ya vienen validados por el middleware de Joi
    const { nombre, apellido, email, password } = req.body;

    try {

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar en la base de datos
        const [newUserId] = await connection('usuarios').insert({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            activo: true,
            created_at: new Date()
        });

        res.status(201).json({
            success: true,
            data: { id: newUserId, nombre, apellido, email, activo: true }
        });

        const duration = Date.now() - start;
        logger.info({ 
            event: 'create_user_success', 
            userId: newUserId, 
            duration: `${duration}ms` 
        }, 'Usuario creado correctamente');

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            logger.warn({ email }, 'Intento de registro con usuario duplicado');
            return res.status(409).json({ 
                success: false, 
                message: 'El usuario ya está registrado en el sistema.' 
            });
        }

        logger.error({ 
            event: 'create_user_error', 
            error: error.message, 
            stack: error.stack 
        }, 'Error crítico al crear usuario');

        res.status(500).json({ 
            success: false, 
            message: 'Hubo un problema al procesar su solicitud. Contacte a soporte.' 
        });
    }
};

export const updateUser = async (req, res) => {
    const start = Date.now();
    const userId = req.params.id;
    const { nombre, apellido, email, activo } = req.body;

    logger.info({ userId }, 'Iniciando actualización de usuario...');

    try {
        const updatedRows = await connection('usuarios')
            .where({ id: userId })
            .update({ 
                nombre, 
                apellido, 
                email, 
                activo,
                updated_at: new Date()
            });

        if (updatedRows === 0) {
            logger.warn({ userId }, 'Intento de actualizar usuario no existente');
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const duration = Date.now() - start;
        logger.info({ event: 'update_user_success', userId, duration: `${duration}ms` }, 'Usuario actualizado');

        res.status(200).json({ success: true, message: 'Usuario actualizado correctamente.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            logger.warn({ userId, email }, 'Intento de actualizar a un usuario duplicado');
            return res.status(409).json({
                success: false, 
                message: 'El usuario ya está registrado en el sistema.' 
            });
        }

        logger.error({ event: 'update_user_error', userId, error: error.message, stack: error.stack }, 'Error crítico al actualizar usuario');
        res.status(500).json({ success: false, message: 'Hubo un problema al procesar su solicitud. Contacte a soporte.' });
    }   
}

export const deleteUser = async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.user.id;
    logger.info({ userId }, 'Iniciando eliminación de usuario...');
    
    // PROTECCIÓN
    if (parseInt(userId) === parseInt(currentUserId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'No puedes eliminar tu propia cuenta mientras estás logueado.' 
        });
    }

    try {
        // Primero eliminamos sus tokens de refresco
        await connection('refreshTokens').where({ user_id: userId }).del();
        
        // Luego eliminamos el usuario definitivamente
        const deletedRows = await connection('usuarios')
            .where({ id: userId })
            .del();
            
        if (deletedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        
        logger.info({ userId }, 'Usuario eliminado correctamente');
        res.status(200).json({ success: true, message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        logger.error({ 
            event: 'delete_user_error', 
            error: error.message, 
            stack: error.stack 
        }, 'Error crítico al eliminar usuario');

        res.status(500).json({
            success: false,
            message: 'Hubo un problema al procesar su solicitud. Contacte a soporte.'
        });
    }
}

export const getProfile = async (req, res) => {
    const userId = req.user.id; 

    try {
        const user = await connection('usuarios')
            .select('id', 'nombre', 'apellido', 'email', 'activo', 'created_at')
            .where({ id: userId })
            .first();

        if (!user) return res.status(404).json({ message: 'No encontrado' });

        res.status(200).json({
            success: true,
            usuario: {
                id: user.id,
                name: user.nombre, 
                apellido: user.apellido,
                email: user.email
            }
        });

    } catch (error) {
        logger.error({ event: 'get_profile_error', userId, error: error.message, stack: error.stack }, 'Error crítico al obtener perfil de usuario');
        res.status(500).json({ success: false, message: 'Hubo un problema al obtener el perfil. Contacte a soporte.' });
    }
};
