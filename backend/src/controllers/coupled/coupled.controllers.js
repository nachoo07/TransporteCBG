import connection from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';
import { cloudinaryInstance } from '../../../files/cloudinary.js';
import { calcularEstadoGeneral, calcularEstadoFecha } from '../../utils/generalCondition/driverStatus.js';
import { deleteFileFromCloudinary } from '../../../files/deleteFileCloudinary.js';

const verificarInfoCompleta = (coupled) => {
    const camposObligatorios = [
        coupled.Dominio_acoplado,
        coupled.vencimiento_cedula_acoplado,
        coupled.vencimiento_vtv_acoplado,
        coupled.vencimiento_senasa_acoplado,
        coupled.vencimiento_homologacion_acoplado,
        coupled.vencimiento_tipificacion_carga_acoplado,
        coupled.url_cedula_acoplado,
        coupled.url_vtv_acoplado,
        coupled.url_senasa_acoplado,
        coupled.url_homologacion_acoplado,
        coupled.url_tipificacion_carga_acoplado,
        coupled.url_titulo_acoplado


    ];
    return camposObligatorios.every(campo => campo !== null && campo !== undefined && campo !== '' );
};


export const getAllCoupled = async (req, res) => {
    const startTime = Date.now();
    logger.info('Obteniendo todos los acoplados activos de la base de datos.');
    try {
        const coupled = await connection('acoplado')
            .select(
                'id', 'Dominio_acoplado', 'activo', 'estado_general',
                'vencimiento_cedula_acoplado', 'vencimiento_vtv_acoplado',
                'vencimiento_senasa_acoplado', 'vencimiento_homologacion_acoplado',
                'vencimiento_tipificacion_carga_acoplado',
                'url_cedula_acoplado', 'url_vtv_acoplado', 'url_senasa_acoplado',
                'url_homologacion_acoplado', 'url_tipificacion_carga_acoplado',
                'url_titulo_acoplado', 'created_at', 'updated_at'
            )
            .where('activo', true);

        const coupledRaw = coupled.map(c => ({
            ...c,
            info_completa: verificarInfoCompleta(c)
        }));

        const duration = Date.now() - startTime;

        logger.info({
            event: 'get_all_acoplados_success',
            count: coupledRaw.length,
            duration: `${duration}ms`
        }, 'Acoplados activos obtenidos correctamente.');

        res.status(200).json({
            success: true,
            data: coupledRaw,
            meta: {
                total: coupledRaw.length,
                timestamp: new Date()
            }
        });
    } catch (error) {
        logger.error({
            event: 'get_all_acoplados_error',
            error: error.message,
            stack: error.stack
        }, 'Error crítico al obtener acoplados.');

        res.status(500).json({
            success: false,
            message: 'Hubo un problema procesando la solicitud. Contacte al soporte.'
        });
    }
};

export const getCoupledById = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info(`Obteniendo acoplado con ID: ${id}`);
    try {
        const coupled = await connection('acoplado')
            .select(
                'id', 'Dominio_acoplado', 'activo', 'estado_general',
                'vencimiento_cedula_acoplado', 'vencimiento_vtv_acoplado',
                'vencimiento_senasa_acoplado', 'vencimiento_homologacion_acoplado',
                'vencimiento_tipificacion_carga_acoplado',
                'url_cedula_acoplado', 'url_vtv_acoplado', 'url_senasa_acoplado',
                'url_homologacion_acoplado', 'url_tipificacion_carga_acoplado',
                'url_titulo_acoplado', 'created_at', 'updated_at'
            )
            .where({ id })
            .first();

        if (!coupled) {
            logger.warn({
                event: 'get_coupled_not_found',
                id
            }, `Acoplado con ID: ${id} no encontrado.`);
            return res.status(404).json({
                success: false,
                message: 'Acoplado no encontrado.'
            });
        }

         const coupledConEstados = {
                    ...coupled,
                    estado_cedula_acoplado: calcularEstadoFecha(coupled.vencimiento_cedula_acoplado),
                    estado_vtv_acoplado: calcularEstadoFecha(coupled.vencimiento_vtv_acoplado),
                    estado_senasa_acoplado: calcularEstadoFecha(coupled.vencimiento_senasa_acoplado),
                    estado_tipificacion_acoplado: calcularEstadoFecha(coupled.vencimiento_tipificacion_carga_acoplado),
                    estado_homologacion_acoplado: calcularEstadoFecha(coupled.vencimiento_homologacion_acoplado),
                };

        const duration = Date.now() - startTime;

        logger.info({
            event: 'get_coupled_success',
            id,
            duration: `${duration}ms`
        }, `Acoplado con ID: ${id} obtenido correctamente.`);

        res.status(200).json({
            success: true,
            data: coupledConEstados,
            meta: {
                timestamp: new Date()
            }
        });
    } catch (error) {
        logger.error({
            event: 'get_acoplado_error',
            id,
            error: error.message,
            stack: error.stack
        }, `Error crítico al obtener acoplado con ID: ${id}.`);

        res.status(500).json({
            success: false,
            message: 'Hubo un problema procesando la solicitud. Contacte al soporte.'
        });
    }
};

export const createCoupled = async (req, res) => {
    const startTime = Date.now();
    const files = req.files || {};

    try {
        const rawData = req.body;
        const getUrl = (fieldName) => (files[fieldName] && files[fieldName].length > 0) ? files[fieldName][0].path : null;

        const estadoCalculado = calcularEstadoGeneral({
            vencimiento_cedula: rawData.vencimiento_cedula_acoplado,
            vencimiento_vtv: rawData.vencimiento_vtv_acoplado,
            vencimiento_senasa: rawData.vencimiento_senasa_acoplado,
            vencimiento_homologacion: rawData.vencimiento_homologacion_acoplado,
            vencimiento_tipificacion_carga: rawData.vencimiento_tipificacion_carga_acoplado,
        });

        const cleanDate = (date) => (date === '' || date === 'null' || date === undefined ? null : date);

        const coupledToSave = {
            Dominio_acoplado: rawData.Dominio_acoplado,
            activo: rawData.activo === 'false' ? false : true,
            estado_general: estadoCalculado,

            url_cedula_acoplado: getUrl('url_cedula_acoplado'),
            url_tipificacion_carga_acoplado: getUrl('url_tipificacion_carga_acoplado'),
            url_senasa_acoplado: getUrl('url_senasa_acoplado'),
            url_titulo_acoplado: getUrl('url_titulo_acoplado'),
            url_vtv_acoplado: getUrl('url_vtv_acoplado'),
            url_homologacion_acoplado: getUrl('url_homologacion_acoplado'),

            vencimiento_cedula_acoplado: cleanDate(rawData.vencimiento_cedula_acoplado),
            vencimiento_tipificacion_carga_acoplado: cleanDate(rawData.vencimiento_tipificacion_carga_acoplado),
            vencimiento_senasa_acoplado: cleanDate(rawData.vencimiento_senasa_acoplado),
            vencimiento_vtv_acoplado: cleanDate(rawData.vencimiento_vtv_acoplado),
            vencimiento_homologacion_acoplado: cleanDate(rawData.vencimiento_homologacion_acoplado)
        };
        
        const [newCoupledId] = await connection('acoplado').insert(coupledToSave);
        const duration = Date.now() - startTime;

        logger.info({
            event: 'create_acoplado_success',
            newCoupledId,
            duration: `${duration}ms`
        }, 'Acoplado creado correctamente.');

        res.status(201).json({
            success: true,
            data: { id: newCoupledId, ...coupledToSave }
        });
    } catch (error) {
        // Rollback archivos subidos
        if (Object.keys(files).length > 0) {
            await Promise.all(
                Object.keys(files).map(key => {
                    const f = files[key][0];
                    const isPdf = f.mimetype === 'application/pdf';
                    return cloudinaryInstance.uploader.destroy(
                        f.filename,
                        { resource_type: isPdf ? 'raw' : 'image' }
                    );
                })
            );
            logger.info('🗑️ Rollback: Archivos eliminados de Cloudinary');
        }

        let statuscode = 500;
        let clientMessage = 'Hubo un problema procesando la solicitud. Contacte al soporte.';

        if (error.code === 'ER_DUP_ENTRY') {
            statuscode = 409;
            if (error.message.includes('Dominio_coupled') || error.message.includes('Dominio_acoplado')) {
                clientMessage = 'El dominio del acoplado ya está registrado en el sistema.';
            } else {
                clientMessage = 'Ya existe un registro con esos datos únicos.';
            }
            logger.warn({ event: 'duplicate_entry', error: error.message }, 'Intento de crear acoplado duplicado');
        } else {
            logger.error({
                event: 'create_coupled_error',
                error: error.message,
                stack: error.stack
            }, 'Error crítico al crear acoplado.');
        }

        return res.status(statuscode).json({ success: false, message: clientMessage });
       
    }
};

export const updateCoupled = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info(`Actualizando acoplado con ID: ${id}`);
    const files = req.files || {}; // Archivos NUEVOS

    try {
        const currentCoupled = await connection('acoplado').where({ id }).first();
        if (!currentCoupled) return res.status(404).json({ success: false, message: 'Acoplado no encontrado.' });

        const rawData = req.body;
        const getNewUrl = (name) => (files[name] && files[name].length > 0) ? files[name][0].path : null;

        const oldFilesToDelete = [];
        const coupledToUpdate = {};

        // Helper fechas
        const resolver = (nueva, vieja) => (nueva === undefined ? vieja : (nueva === '' || nueva === null ? null : nueva));
        const resolverBool = (nueva, vieja) => (nueva === undefined ? vieja : nueva === 'false' ? false : nueva === false ? false : true);

        // --- ACTUALIZACIÓN DE CAMPOS DE TEXTO/FECHAS ---
        const nuevoDominio = (rawData.Dominio_acoplado !== undefined) ? rawData.Dominio_acoplado : (rawData.Dominio_coupled !== undefined ? rawData.Dominio_coupled : undefined);
        
        // Validar Dominio duplicado si se está cambiando
        if (nuevoDominio !== undefined && nuevoDominio !== currentCoupled.Dominio_acoplado) {
            const existingCoupled = await connection('acoplado')
                .where({ Dominio_acoplado: nuevoDominio })
                .whereNot({ id })
                .first();
            
            if (existingCoupled) {
                // Rollback archivos nuevos
                if (Object.keys(files).length > 0) {
                    await Promise.all(
                        Object.keys(files).map(key => {
                            const f = files[key][0];
                            const isPdf = f.mimetype === 'application/pdf';
                            return cloudinaryInstance.uploader.destroy(
                                f.filename,
                                { resource_type: isPdf ? 'raw' : 'image' }
                            );
                        })
                    );
                }
                return res.status(409).json({
                    success: false,
                    message: `El dominio ${nuevoDominio} ya está registrado en el sistema (Acoplado ID: ${existingCoupled.id}).`
                });
            }
            coupledToUpdate.Dominio_acoplado = nuevoDominio;
        } else if (nuevoDominio !== undefined) {
            coupledToUpdate.Dominio_acoplado = nuevoDominio;
        }
        if (rawData.activo !== undefined) coupledToUpdate.activo = resolverBool(rawData.activo, currentCoupled.activo);
        
        // Fechas: manejamos el null explícito o actualización
        coupledToUpdate.vencimiento_cedula_acoplado = resolver(rawData.vencimiento_cedula_acoplado, currentCoupled.vencimiento_cedula_acoplado);
        coupledToUpdate.vencimiento_tipificacion_carga_acoplado = resolver(rawData.vencimiento_tipificacion_carga_acoplado, currentCoupled.vencimiento_tipificacion_carga_acoplado);
        coupledToUpdate.vencimiento_senasa_acoplado = resolver(rawData.vencimiento_senasa_acoplado, currentCoupled.vencimiento_senasa_acoplado);
        coupledToUpdate.vencimiento_vtv_acoplado = resolver(rawData.vencimiento_vtv_acoplado, currentCoupled.vencimiento_vtv_acoplado);
        coupledToUpdate.vencimiento_homologacion_acoplado = resolver(rawData.vencimiento_homologacion_acoplado, currentCoupled.vencimiento_homologacion_acoplado);

        coupledToUpdate.estado_general = calcularEstadoGeneral({
            vencimiento_cedula: coupledToUpdate.vencimiento_cedula_acoplado || currentCoupled.vencimiento_cedula_acoplado,
            vencimiento_vtv: coupledToUpdate.vencimiento_vtv_acoplado || currentCoupled.vencimiento_vtv_acoplado,
            vencimiento_senasa: coupledToUpdate.vencimiento_senasa_acoplado || currentCoupled.vencimiento_senasa_acoplado,
            vencimiento_homologacion: coupledToUpdate.vencimiento_homologacion_acoplado || currentCoupled.vencimiento_homologacion_acoplado,
            vencimiento_tipificacion_carga: coupledToUpdate.vencimiento_tipificacion_carga_acoplado || currentCoupled.vencimiento_tipificacion_carga_acoplado,
        });

        coupledToUpdate.updated_at = new Date();

        // Archivos (Swap & Delete)
        const procesar = (campoUrl, campoFile, campoEliminar) => {
            const nuevaUrl = getNewUrl(campoFile);
            const quiereEliminar = rawData[campoEliminar] === 'true';

            if (nuevaUrl) {
                coupledToUpdate[campoUrl] = nuevaUrl;
                if (currentCoupled[campoUrl]) oldFilesToDelete.push(currentCoupled[campoUrl]);
            } else if (quiereEliminar) {
                coupledToUpdate[campoUrl] = null;
                if (currentCoupled[campoUrl]) oldFilesToDelete.push(currentCoupled[campoUrl]);
            }
        };
        // --- LÓGICA DE ARCHIVOS (SWAP) ---
        // Array de configuración para iterar y no repetir código
        
        procesar('url_cedula_acoplado', 'url_cedula_acoplado', 'eliminar_cedula');
        procesar('url_tipificacion_carga_acoplado', 'url_tipificacion_carga_acoplado', 'eliminar_tipificacion');
        procesar('url_senasa_acoplado', 'url_senasa_acoplado', 'eliminar_senasa');
        procesar('url_titulo_acoplado', 'url_titulo_acoplado', 'eliminar_titulo');
        procesar('url_vtv_acoplado', 'url_vtv_acoplado', 'eliminar_vtv');
        procesar('url_homologacion_acoplado', 'url_homologacion_acoplado', 'eliminar_homologacion');
        
        // 2. ACTUALIZAR EN BASE DE DATOS
        await connection('acoplado').where({ id }).update({
            ...coupledToUpdate,
            updated_at: new Date()
        });

     // Borrar viejos
        if (oldFilesToDelete.length > 0) {
            await Promise.all(oldFilesToDelete.map(url => deleteFileFromCloudinary(url)));
        }

        const duration = Date.now() - startTime;
        logger.info({ 
            event: 'update_acoplado_success', 
            id, 
            duration: `${duration}ms` 
        }, 'Acoplado actualizado correctamente.');

        res.status(200).json({
            success: true,
            message: 'Acoplado actualizado correctamente.',
            data: coupledToUpdate
        });

    } catch (error) {
        // Rollback archivos nuevos
        if (Object.keys(files).length > 0) {
            await Promise.all(
                Object.keys(files).map(key => {
                    const f = files[key][0];
                    const isPdf = f.mimetype === 'application/pdf';
                    return cloudinaryInstance.uploader.destroy(
                        f.filename,
                        { resource_type: isPdf ? 'raw' : 'image' }
                    );
                })
            );
            logger.info('🗑️ Rollback: Archivos eliminados de Cloudinary');
        }
        logger.error({ 
            event: 'update_acoplado_error', 
            error: error.message, 
            stack: error.stack 
        }, 'Error crítico al actualizar acoplado. Revirtiendo archivos nuevos.');

        res.status(500).json({ 
            success: false, 
            message: 'Hubo un problema procesando la solicitud.' 
        });
    }
};

export const deleteCoupled = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info(`Archivando acoplado con ID: ${id}`);

    try {
        const coupledToDelete = await connection('acoplado').where({ id }).first();

        if (!coupledToDelete) {
            return res.status(404).json({ success: false, message: 'Acoplado no encontrado.' });
        }

        // Soft delete: marcar como inactivo
        await connection('acoplado')
            .where({ id })
            .update({
                activo: false,
                fecha_de_baja: new Date()
            });

        const duration = Date.now() - startTime;
        logger.info({ 
            event: 'delete_acoplado_success', 
            id, 
            duration: `${duration}ms` 
        }, 'Acoplado archivado correctamente.');

        res.status(200).json({
            success: true,
            message: 'Acoplado archivado exitosamente.'
        });

    } catch (error) {
        logger.error({ 
            event: 'delete_acoplado_error', 
            id,
            error: error.message 
        }, 'Error crítico al archivar acoplado.');
        
        res.status(500).json({ 
            success: false, 
            message: 'Hubo un error al archivar el acoplado.' 
        });
    }
};

export const getInactiveCoupled = async (req, res) => {
    const startTime = Date.now();
    logger.info('Obteniendo todos los acoplados inactivos de la base de datos.');
    try {
        const coupled = await connection('acoplado')
            .select(
                'id', 'Dominio_acoplado', 'activo', 'estado_general', 'fecha_de_baja',
                'vencimiento_cedula_acoplado', 'vencimiento_vtv_acoplado',
                'vencimiento_senasa_acoplado', 'vencimiento_homologacion_acoplado',
                'vencimiento_tipificacion_carga_acoplado',
                'url_cedula_acoplado', 'url_vtv_acoplado', 'url_senasa_acoplado',
                'url_homologacion_acoplado', 'url_tipificacion_carga_acoplado',
                'url_titulo_acoplado', 'created_at', 'updated_at'
            )
            .where('activo', false)
            .orderBy('fecha_de_baja', 'desc');

        const coupledRaw = coupled.map(c => ({
            ...c,
            info_completa: verificarInfoCompleta(c)
        }));

        const duration = Date.now() - startTime;

        logger.info({
            event: 'get_inactive_acoplados_success',
            count: coupledRaw.length,
            duration: `${duration}ms`
        }, 'Acoplados inactivos obtenidos correctamente.');

        res.status(200).json({
            success: true,
            data: coupledRaw,
            meta: {
                total: coupledRaw.length,
                timestamp: new Date()
            }
        });
    } catch (error) {
        logger.error({
            event: 'get_inactive_acoplados_error',
            error: error.message,
            stack: error.stack
        }, 'Error crítico al obtener acoplados inactivos.');

        res.status(500).json({
            success: false,
            message: 'Hubo un problema procesando la solicitud. Contacte al soporte.'
        });
    }
};

export const reactivateCoupled = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info(`Iniciando reactivación de acoplado con ID: ${id}`);

    try {
        const coupled = await connection('acoplado').where({ id }).first();

        if (!coupled) {
            return res.status(404).json({ success: false, message: 'Acoplado no encontrado' });
        }

        if (coupled.activo) {
            return res.status(400).json({ success: false, message: 'El acoplado ya está activo.' });
        }

        // Reactivar: activo = true, fecha_de_baja = null
        await connection('acoplado')
            .where({ id })
            .update({
                activo: true,
                fecha_de_baja: null
            });

        const duration = Date.now() - startTime;
        logger.info({ event: 'reactivate_acoplado_success', coupledId: id, duration: `${duration}ms` }, 'Acoplado reactivado');

        res.status(200).json({
            success: true,
            message: 'Acoplado reactivado exitosamente',
            data: { id, activo: true, fecha_de_baja: null }
        });

    } catch (error) {
        logger.error({ event: 'reactivate_acoplado_error', coupledId: id, error: error.message }, 'Error al reactivar acoplado');
        res.status(500).json({ success: false, message: 'Error interno al reactivar el acoplado.' });
    }
};
