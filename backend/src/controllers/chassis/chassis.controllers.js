import connection from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';
import { cloudinaryInstance } from '../../../files/cloudinary.js';
import { calcularEstadoGeneral, calcularEstadoFecha } from '../../utils/generalCondition/driverStatus.js';
import { deleteFileFromCloudinary } from '../../../files/deleteFileCloudinary.js';
import { buildServiceSnapshot, toFiniteNumberOrNull } from '../../utils/chassis/serviceStatus.js';

// Función auxiliar para rollback de archivos en caso de error
const rollbackUploadedFiles = async (files) => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length > 0) {
        await Promise.all(fileKeys.map(key => {
            const f = files[key][0];
            const isPdf = f.mimetype === 'application/pdf';
            return cloudinaryInstance.uploader.destroy(f.filename, { resource_type: isPdf ? 'raw' : 'image' });
        }));
        logger.info('🗑️ Rollback: Archivos subidos eliminados por error en transacción.');
    }
};

const verificarInfoCompleta = (chassis) => {
    const camposRequeridos = [
        chassis.Dominio_chasis,
        chassis.vencimiento_vtv_chasis,
        chassis.vencimiento_senasa_chasis,
        chassis.url_cedula_chasis,
        chassis.url_vtv_chasis,
        chassis.url_senasa_chasis,
        chassis.url_homologacion_chasis,
        chassis.url_tipificacion_carga_chasis,
        chassis.url_titulo_chasis
    ];
    return camposRequeridos.every(campo => campo !== null && campo !== undefined && campo !== '');
}

const withServiceData = (chassis) => ({
    ...chassis,
    ...buildServiceSnapshot(chassis),
});

const calculateAccumulatedKmFromTrips = async (chassisId) => {
    const trips = await connection('viajes_registrados')
        .select(
            'combustible_km', 'combustible_km_fin',
            'combustible_km_vuelta', 'combustible_km_fin_vuelta'
        )
        .where({ chasis_id: chassisId, anulado: false });

    return trips.reduce((total, trip) => {
        const kmInicio = toFiniteNumberOrNull(trip.combustible_km);
        const kmFin = toFiniteNumberOrNull(trip.combustible_km_fin);
        const kmInicioVuelta = toFiniteNumberOrNull(trip.combustible_km_vuelta);
        const kmFinVuelta = toFiniteNumberOrNull(trip.combustible_km_fin_vuelta);

        const ida = (kmInicio === null || kmFin === null) ? 0 : Math.max(0, kmFin - kmInicio);
        const vuelta = (kmInicioVuelta === null || kmFinVuelta === null) ? 0 : Math.max(0, kmFinVuelta - kmInicioVuelta);
        return total + ida + vuelta;
    }, 0);
};



export const getAllChassis = async (req, res) => {
    const startTime = Date.now();
    logger.info({ event: 'getAllChassis' }, 'Obteniendo chasis activos');
    try {
        const chassis = await connection('chasis')
            .select(
                'id', 'Dominio_chasis', 'activo', 'estado_general',
                'vencimiento_cedula_chasis', 'vencimiento_vtv_chasis',
                'vencimiento_senasa_chasis', 'vencimiento_homologacion_chasis',
                'vencimiento_tipificacion_carga_chasis',
                'km_inicial', 'km_actual', 'km_ultimo_service',
                'fecha_ultimo_service', 'observacion_ultimo_service', 'service_intervalo_km',
                'url_cedula_chasis', 'url_vtv_chasis', 'url_senasa_chasis',
                'url_homologacion_chasis', 'url_tipificacion_carga_chasis',
                'url_titulo_chasis', 'created_at', 'updated_at'
            )
            .where('activo', true);

        const chassisRaw = chassis.map(item => withServiceData({
            ...item,
            info_completa: verificarInfoCompleta(item)
        }));

        const duration = Date.now() - startTime;
        logger.info({
            event: 'getAllChassis',
            count: chassisRaw.length,
            duration_ms: `${duration}ms`
        }, 'Chasis activos obtenidos correctamente');

        res.status(200).json({ success: true, data: chassisRaw, meta: { total: chassisRaw.length, timestamp: new Date() } });
    } catch (error) {
        logger.error({
            event: 'getAllChassisError',
            error: error.message,
            stack: error.stack
        },
            'Error al obtener chasis');
        res.status(500).json({ success: false, message: 'Hubo un problema al obtener los chasis. Contacte al soporte.' });
    }
};

export const getChassisById = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info({ event: 'getChassisById', id }, 'Obteniendo chasis por ID');
    try {
        const chassis = await connection('chasis')
            .select(
                'id', 'Dominio_chasis', 'activo', 'estado_general',
                'vencimiento_cedula_chasis', 'vencimiento_vtv_chasis',
                'vencimiento_senasa_chasis', 'vencimiento_homologacion_chasis',
                'vencimiento_tipificacion_carga_chasis',
                'km_inicial', 'km_actual', 'km_ultimo_service',
                'fecha_ultimo_service', 'observacion_ultimo_service', 'service_intervalo_km',
                'url_cedula_chasis', 'url_vtv_chasis', 'url_senasa_chasis',
                'url_homologacion_chasis', 'url_tipificacion_carga_chasis',
                'url_titulo_chasis', 'created_at', 'updated_at'
            )
            .where({ id })
            .first();
        if (!chassis) {
            logger.warn({ event: 'getChassisByIdNotFound', id }, 'Chasis no encontrado');
            return res.status(404).json({ success: false, message: 'Chasis no encontrado.' });
        }

        const chassisConEstados = withServiceData({
            ...chassis,
            estado_cedula_chasis: calcularEstadoFecha(chassis.vencimiento_cedula_chasis),
            estado_vtv_chasis: calcularEstadoFecha(chassis.vencimiento_vtv_chasis),
            estado_senasa_chasis: calcularEstadoFecha(chassis.vencimiento_senasa_chasis),
            estado_tipificacion_chasis: null,
            estado_homologacion_chasis: null,
        });

        const duration = Date.now() - startTime;
        logger.info({ event: 'getChassisByIdSuccess', id, duration_ms: `${duration}ms` }, 'Chasis obtenido correctamente');

        res.status(200).json({
            success: true,
            data: chassisConEstados,
            meta: {
                timestamp: new Date()
            }
        });
    } catch (error) {
        logger.error({
            event: 'get_chassis_error',
            id,
            error: error.message,
            stack: error.stack
        }, `Error crítico al obtener chasis con ID: ${id}.`);

        res.status(500).json({
            success: false,
            message: 'Hubo un problema procesando su solicitud. Contacte al soporte.'
        });
    }
};

export const createChassis = async (req, res) => {
    const start = Date.now();
    const files = req.files || {};

    try {
        const rawData = req.body;
        const getUrl = (fieldName) => (files[fieldName] && files[fieldName].length > 0) ? files[fieldName][0].path : null;

        // Validación explícita de dominio duplicado
        if (rawData.Dominio_chasis) {
            const existing = await connection('chasis')
                .where({ Dominio_chasis: rawData.Dominio_chasis })
                .first();
            if (existing) {
                await rollbackUploadedFiles(files);
                return res.status(409).json({
                    success: false,
                    message: `El dominio ${rawData.Dominio_chasis} ya está registrado.`
                });
            }
        }

        const estadoCalculado = calcularEstadoGeneral({
            vencimiento_vtv: rawData.vencimiento_vtv_chasis,
            vencimiento_senasa: rawData.vencimiento_senasa_chasis,
        });
        const kmInicial = toFiniteNumberOrNull(rawData.km_inicial) ?? 0;

        const cleanDate = (date) => (date === '' || date === 'null' || date === undefined) ? null : date;
        const chassisToSave = {
            Dominio_chasis: rawData.Dominio_chasis,
            activo: rawData.activo === 'false' ? false : true,
            estado_general: estadoCalculado,
            km_inicial: kmInicial,
            km_actual: kmInicial,
            km_ultimo_service: kmInicial,
            fecha_ultimo_service: cleanDate(rawData.fecha_ultimo_service),
            observacion_ultimo_service: rawData.observacion_ultimo_service || null,
            service_intervalo_km: toFiniteNumberOrNull(rawData.service_intervalo_km) ?? 40000,

            vencimiento_cedula_chasis: cleanDate(rawData.vencimiento_cedula_chasis),
            vencimiento_tipificacion_carga_chasis: cleanDate(rawData.vencimiento_tipificacion_carga_chasis),
            vencimiento_senasa_chasis: cleanDate(rawData.vencimiento_senasa_chasis),
            vencimiento_vtv_chasis: cleanDate(rawData.vencimiento_vtv_chasis),
            vencimiento_homologacion_chasis: cleanDate(rawData.vencimiento_homologacion_chasis),

            url_cedula_chasis: getUrl('url_cedula_chasis'),
            url_tipificacion_carga_chasis: getUrl('url_tipificacion_carga_chasis'),
            url_senasa_chasis: getUrl('url_senasa_chasis'),
            url_titulo_chasis: getUrl('url_titulo_chasis'),
            url_vtv_chasis: getUrl('url_vtv_chasis'),
            url_homologacion_chasis: getUrl('url_homologacion_chasis'),
        };

        const [newId] = await connection('chasis').insert(chassisToSave);
        const createdChassis = await connection('chasis').where({ id: newId }).first();
        const createdChassisWithStatus = withServiceData({
            ...createdChassis,
            info_completa: verificarInfoCompleta(createdChassis)
        });

        logger.info(`✅ Chasis creado ID: ${newId}`);
        res.status(201).json({ success: true, data: createdChassisWithStatus });

    } catch (error) {
        await rollbackUploadedFiles(files);

        let statusCode = 500;
        let clientMessage = 'Error al crear chasis.';

        if (error.code === 'ER_DUP_ENTRY') {
            statusCode = 409;
            clientMessage = error.message.includes('Dominio')
                ? 'El dominio ya está registrado en otro chasis.'
                : 'Datos duplicados detectados.';
        }

        logger.error({
            event: 'create_chassis_error',
            error: error.message,
            stack: error.stack,
            code: error.code
        }, 'Error crítico al crear chasis');

        res.status(statusCode).json({ success: false, message: clientMessage });
    }
};

export const updateChassis = async (req, res) => {
    const { id } = req.params;
    const files = req.files || {};

    try {
        const currentChassis = await connection('chasis').where({ id }).first();
        if (!currentChassis) return res.status(404).json({ success: false, message: 'No encontrado' });

        const rawData = req.body;

        // Validar Dominio duplicado si se está cambiando
        if (rawData.Dominio_chasis && rawData.Dominio_chasis !== currentChassis.Dominio_chasis) {
            const existing = await connection('chasis')
                .where({ Dominio_chasis: rawData.Dominio_chasis })
                .whereNot({ id })
                .first();

            if (existing) {
                await rollbackUploadedFiles(files);
                return res.status(409).json({
                    success: false,
                    message: `El dominio ${rawData.Dominio_chasis} ya está registrado (Chasis ID: ${existing.id}).`
                });
            }
        }

        const getNewUrl = (name) => (files[name] && files[name].length > 0) ? files[name][0].path : null;

        const oldFilesToDelete = [];
        const chassisToUpdate = {};

        // Helper fechas
        const resolver = (nueva, vieja) => (nueva === undefined ? vieja : (nueva === '' || nueva === null ? null : nueva));
        const resolverBool = (nueva, vieja) => (nueva === undefined ? vieja : nueva === 'false' ? false : nueva === false ? false : true);

        // Campos Texto
        if (rawData.Dominio_chasis) chassisToUpdate.Dominio_chasis = rawData.Dominio_chasis;
        if (rawData.activo !== undefined) chassisToUpdate.activo = resolverBool(rawData.activo, currentChassis.activo);
        if (rawData.observacion_ultimo_service !== undefined) chassisToUpdate.observacion_ultimo_service = resolver(rawData.observacion_ultimo_service, currentChassis.observacion_ultimo_service);
        if (rawData.service_intervalo_km !== undefined) chassisToUpdate.service_intervalo_km = toFiniteNumberOrNull(rawData.service_intervalo_km) ?? currentChassis.service_intervalo_km;

        // Fechas
        chassisToUpdate.vencimiento_cedula_chasis = resolver(rawData.vencimiento_cedula_chasis, currentChassis.vencimiento_cedula_chasis);
        chassisToUpdate.vencimiento_vtv_chasis = resolver(rawData.vencimiento_vtv_chasis, currentChassis.vencimiento_vtv_chasis);
        chassisToUpdate.vencimiento_senasa_chasis = resolver(rawData.vencimiento_senasa_chasis, currentChassis.vencimiento_senasa_chasis);
        chassisToUpdate.vencimiento_homologacion_chasis = resolver(rawData.vencimiento_homologacion_chasis, currentChassis.vencimiento_homologacion_chasis);
        chassisToUpdate.vencimiento_tipificacion_carga_chasis = resolver(rawData.vencimiento_tipificacion_carga_chasis, currentChassis.vencimiento_tipificacion_carga_chasis);
        chassisToUpdate.fecha_ultimo_service = resolver(rawData.fecha_ultimo_service, currentChassis.fecha_ultimo_service);
        if (rawData.km_inicial !== undefined) {
            const kmInicial = toFiniteNumberOrNull(rawData.km_inicial);
            if (kmInicial !== null) {
                const kmAcumulados = await calculateAccumulatedKmFromTrips(id);

                chassisToUpdate.km_inicial = kmInicial;
                chassisToUpdate.km_actual = kmInicial + kmAcumulados;

                // Si todavía no se registró ningún service, el km inicial sigue siendo
                // la referencia del contador y conviene mantenerlos alineados.
                if (!currentChassis.fecha_ultimo_service) {
                    chassisToUpdate.km_ultimo_service = kmInicial;
                }
            }
        }

        // Recálculo Estado
        chassisToUpdate.estado_general = calcularEstadoGeneral({
            vencimiento_vtv: chassisToUpdate.vencimiento_vtv_chasis,
            vencimiento_senasa: chassisToUpdate.vencimiento_senasa_chasis,
        });

        chassisToUpdate.updated_at = new Date();

        // Archivos (Swap & Delete)
        const procesar = (campoUrl, campoFile, campoEliminar) => {
            const nuevaUrl = getNewUrl(campoFile);
            const quiereEliminar = rawData[campoEliminar] === 'true';

            if (nuevaUrl) {
                chassisToUpdate[campoUrl] = nuevaUrl;
                if (currentChassis[campoUrl]) oldFilesToDelete.push(currentChassis[campoUrl]);
            } else if (quiereEliminar) {
                chassisToUpdate[campoUrl] = null;
                if (currentChassis[campoUrl]) oldFilesToDelete.push(currentChassis[campoUrl]);
            }
        };

        procesar('url_cedula_chasis', 'url_cedula_chasis', 'eliminar_cedula');
        procesar('url_vtv_chasis', 'url_vtv_chasis', 'eliminar_vtv');
        procesar('url_senasa_chasis', 'url_senasa_chasis', 'eliminar_senasa');
        procesar('url_homologacion_chasis', 'url_homologacion_chasis', 'eliminar_homologacion');
        procesar('url_tipificacion_carga_chasis', 'url_tipificacion_carga_chasis', 'eliminar_tipificacion_carga');
        procesar('url_titulo_chasis', 'url_titulo_chasis', 'eliminar_titulo');

        // Update DB
        await connection('chasis').where({ id }).update(chassisToUpdate);

        // Borrar viejos
        if (oldFilesToDelete.length > 0) {
            await Promise.all(oldFilesToDelete.map(url => deleteFileFromCloudinary(url)));
        }

        const updatedChassis = await connection('chasis').where({ id }).first();
        const updatedChassisWithStatus = withServiceData({
            ...updatedChassis,
            info_completa: verificarInfoCompleta(updatedChassis)
        });

        res.status(200).json({ success: true, message: 'Actualizado', data: updatedChassisWithStatus });

    } catch (error) {
        await rollbackUploadedFiles(files);
        logger.error({
            event: 'update_chassis_error',
            id,
            error: error.message,
            stack: error.stack
        }, 'Error crítico al actualizar chasis');
        res.status(500).json({ success: false, message: 'Error actualizando chasis.' });
    }
};

export const deleteChassis = async (req, res) => {
    const { id } = req.params;
    try {
        const chassis = await connection('chasis').where({ id }).first();
        if (!chassis) return res.status(404).json({ success: false, message: 'Chasis no encontrado' });

        // Soft delete: marcar como inactivo
        await connection('chasis').where({ id }).update({
            activo: false,
            fecha_de_baja: new Date()
        });

        res.status(200).json({ success: true, message: 'Chasis archivado exitosamente' });
    } catch (error) {
        logger.error({ event: 'delete_chassis_error', id, error: error.message }, 'Error al archivar chasis');
        res.status(500).json({ success: false, message: 'Error eliminando chasis.' });
    }
};

export const getInactiveChassis = async (req, res) => {
    const startTime = Date.now();
    logger.info({ event: 'getInactiveChassis' }, 'Obteniendo chasis inactivos');
    try {
        const chassis = await connection('chasis')
            .select(
                'id', 'Dominio_chasis', 'activo', 'estado_general', 'fecha_de_baja',
                'vencimiento_cedula_chasis', 'vencimiento_vtv_chasis',
                'vencimiento_senasa_chasis', 'vencimiento_homologacion_chasis',
                'vencimiento_tipificacion_carga_chasis',
                'km_inicial', 'km_actual', 'km_ultimo_service',
                'fecha_ultimo_service', 'observacion_ultimo_service', 'service_intervalo_km',
                'url_cedula_chasis', 'url_vtv_chasis', 'url_senasa_chasis',
                'url_homologacion_chasis', 'url_tipificacion_carga_chasis',
                'url_titulo_chasis', 'created_at', 'updated_at'
            )
            .where('activo', false)
            .orderBy('fecha_de_baja', 'desc');

        const chassisRaw = chassis.map(item => withServiceData({
            ...item,
            info_completa: verificarInfoCompleta(item)
        }));

        const duration = Date.now() - startTime;
        logger.info({
            event: 'getInactiveChassis',
            count: chassisRaw.length,
            duration_ms: `${duration}ms`
        }, 'Chasis inactivos obtenidos correctamente');

        res.status(200).json({ success: true, data: chassisRaw, meta: { total: chassisRaw.length, timestamp: new Date() } });
    } catch (error) {
        logger.error({
            event: 'getInactiveChassisError',
            error: error.message,
            stack: error.stack
        },
            'Error al obtener chasis inactivos');
        res.status(500).json({ success: false, message: 'Hubo un problema al obtener los chasis inactivos.' });
    }
};

export const reactivateChassis = async (req, res) => {
    const { id } = req.params;
    const startTime = Date.now();
    logger.info(`Iniciando reactivación de chasis con ID: ${id}`);

    try {
        const chassis = await connection('chasis').where({ id }).first();

        if (!chassis) {
            return res.status(404).json({ success: false, message: 'Chasis no encontrado' });
        }

        if (chassis.activo) {
            return res.status(400).json({ success: false, message: 'El chasis ya está activo.' });
        }

        // Reactivar: activo = true, fecha_de_baja = null
        await connection('chasis')
            .where({ id })
            .update({
                activo: true,
                fecha_de_baja: null
            });

        const duration = Date.now() - startTime;
        logger.info({ event: 'reactivate_chassis_success', chassisId: id, duration: `${duration}ms` }, 'Chasis reactivado');

        res.status(200).json({
            success: true,
            message: 'Chasis reactivado exitosamente',
            data: { id, activo: true, fecha_de_baja: null }
        });

    } catch (error) {
        logger.error({ event: 'reactivate_chassis_error', chassisId: id, error: error.message }, 'Error al reactivar chasis');
        res.status(500).json({ success: false, message: 'Error interno al reactivar el chasis.' });
    }
};

export const registerChassisService = async (req, res) => {
    const { id } = req.params;
    const { fecha_service, observacion } = req.body || {};

    try {
        const chassis = await connection('chasis').where({ id }).first();
        if (!chassis) {
            return res.status(404).json({ success: false, message: 'Chasis no encontrado' });
        }

        if (!fecha_service) {
            return res.status(400).json({ success: false, message: 'La fecha del service es obligatoria.' });
        }

        const kmActual = toFiniteNumberOrNull(chassis.km_actual) ?? toFiniteNumberOrNull(chassis.km_inicial) ?? 0;

        await connection('chasis').where({ id }).update({
            fecha_ultimo_service: fecha_service,
            observacion_ultimo_service: observacion || null,
            km_ultimo_service: kmActual,
            updated_at: new Date(),
        });

        const updatedChassis = await connection('chasis').where({ id }).first();
        const response = withServiceData({
            ...updatedChassis,
            info_completa: verificarInfoCompleta(updatedChassis)
        });

        return res.status(200).json({
            success: true,
            message: 'Service registrado correctamente.',
            data: response
        });
    } catch (error) {
        logger.error({
            event: 'register_chassis_service_error',
            id,
            error: error.message,
            stack: error.stack
        }, 'Error al registrar service del chasis');
        return res.status(500).json({ success: false, message: 'Error registrando el service del chasis.' });
    }
};
