import connection from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';
import { cloudinaryInstance } from '../../../files/cloudinary.js';
import { calcularEstadoGeneral } from '../../utils/generalCondition/driverStatus.js';
import { deleteFileFromCloudinary } from '../../../files/deleteFileCloudinary.js';

// --- FUNCIONES AUXILIARES ---

// 1. Verificar si el perfil está completo
const tieneValor = (v) =>
  v !== null &&
  v !== undefined &&
  v !== '' &&
  v !== 'null';

const verificarInfoCompleta = (driver) => {
  return [
    driver.nombre,
    driver.apellido,
    driver.dni,
    driver.fecha_de_alta,

    driver.url_dni,
    driver.url_licencia,
    driver.vencimiento_licencia,

    driver.url_psicofisico,
    driver.vencimiento_psicofisico,

    driver.url_curso_carga_normal,
    driver.vencimiento_carga_normal,

    driver.url_curso_carga_peligrosa,
    driver.vencimiento_carga_peligrosa
  ].every(tieneValor);
};

// 2. Rollback de archivos (Borra fotos si falla la creación/edición)
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

// --- CONTROLADORES ---

export const getDrivers = async (req, res) => {
    const start = Date.now(); 
    logger.info('Iniciando petición para obtener conductores...');

    try {
        const driversRaw = await connection('choferes')
            .select(
                'id', 'nombre', 'apellido', 'dni', 'activo',
                'estado_general', 'fecha_de_alta', 'fecha_de_baja',
                'vencimiento_licencia', 'vencimiento_psicofisico',
                'vencimiento_carga_normal', 'vencimiento_carga_peligrosa',
                'url_dni', 'url_licencia', 'url_psicofisico',
                'url_curso_carga_normal', 'url_curso_carga_peligrosa',
                'notas', 'created_at', 'updated_at'
            )
            .where('activo', true) // 🔥 FILTRO: Solo choferes activos
            .orderBy('apellido', 'asc');

        // Agregamos el campo calculado info_completa
        const drivers = driversRaw.map(driver => ({
            ...driver,
            info_completa: verificarInfoCompleta(driver)
        }));
        
        const duration = Date.now() - start;
        logger.info({ event: 'get_drivers_success', count: drivers.length, duration: `${duration}ms` });

        res.status(200).json({
            success: true,
            data: drivers,
            meta: { total: drivers.length, timestamp: new Date() }
        });

    } catch (error) {
        logger.error({ event: 'get_drivers_error', error: error.message }, 'Error al obtener conductores');
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

export const getInactiveDrivers = async (req, res) => {
    const start = Date.now(); 
    logger.info('Iniciando petición para obtener conductores inactivos...');

    try {
        const driversRaw = await connection('choferes')
            .select(
                'id', 'nombre', 'apellido', 'dni', 'activo',
                'estado_general', 'fecha_de_alta', 'fecha_de_baja',
                'vencimiento_licencia', 'vencimiento_psicofisico',
                'vencimiento_carga_normal', 'vencimiento_carga_peligrosa',
                'url_dni', 'url_licencia', 'url_psicofisico',
                'url_curso_carga_normal', 'url_curso_carga_peligrosa',
                'notas', 'created_at', 'updated_at'
            )
            .where('activo', false) // 🔥 FILTRO: Solo choferes INACTIVOS
            .orderBy('fecha_de_baja', 'desc'); // Ordenados por baja más reciente

        const drivers = driversRaw.map(driver => ({
            ...driver,
            info_completa: verificarInfoCompleta(driver)
        }));
        
        const duration = Date.now() - start;
        logger.info({ event: 'get_inactive_drivers_success', count: drivers.length, duration: `${duration}ms` });

        res.status(200).json({
            success: true,
            data: drivers,
            meta: { total: drivers.length, timestamp: new Date() }
        });

    } catch (error) {
        logger.error({ event: 'get_inactive_drivers_error', error: error.message }, 'Error al obtener choferes inactivos');
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

export const reactivateDriver = async (req, res) => {
    const { id } = req.params;
    const start = Date.now();
    logger.info(`Iniciando reactivación de conductor con ID: ${id}`);

    try {
        const driver = await connection('choferes').where({ id }).first();

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        if (driver.activo) {
            return res.status(400).json({ success: false, message: 'El conductor ya está activo.' });
        }

        // Reactivar: activo = true, fecha_de_baja = null
        await connection('choferes')
            .where({ id })
            .update({
                activo: true,
                fecha_de_baja: null
            });

        const duration = Date.now() - start;
        logger.info({ event: 'reactivate_driver_success', driverId: id, duration: `${duration}ms` }, 'Conductor reactivado');

        res.status(200).json({
            success: true,
            message: 'Conductor reactivado exitosamente',
            data: { id, activo: true, fecha_de_baja: null }
        });

    } catch (error) {
        logger.error({ event: 'reactivate_driver_error', driverId: id, error: error.message }, 'Error al reactivar conductor');
        res.status(500).json({ success: false, message: 'Error interno al reactivar el conductor.' });
    }
};

export const getDriverById = async (req, res) => {
    const { id } = req.params;
    try {
        const driver = await connection('choferes')
            .select('*')
            .where({ id })
            .first();

        if (!driver) return res.status(404).json({ success: false, message: 'Conductor no encontrado' });

        res.status(200).json({ success: true, data: driver });
    } catch (error) {
        logger.error({ event: 'get_driver_error', driverId: id, error: error.message });
        res.status(500).json({ success: false, message: 'Error interno.' });
    }
};

export const createDriver = async (req, res) => {
    const start = Date.now(); 
    const files = req.files || {}; 

    try {
        const rawData = req.body;
        const getUrl = (fieldName) => (files[fieldName] && files[fieldName].length > 0) ? files[fieldName][0].path : null;

        const estadoCalculado = calcularEstadoGeneral({
            vencimiento_licencia: rawData.vencimiento_licencia,
            vencimiento_psicofisico: rawData.vencimiento_psicofisico,
            vencimiento_carga_normal: rawData.vencimiento_carga_normal,
            vencimiento_carga_peligrosa: rawData.vencimiento_carga_peligrosa
        });

        const driverToSave = {
            nombre: rawData.nombre,
            apellido: rawData.apellido,
            dni: rawData.dni,
            activo: rawData.activo === 'false' ? false : true, // Por defecto true
            fecha_de_alta: rawData.fecha_de_alta || new Date(),
            fecha_de_baja: null,
            vencimiento_licencia: rawData.vencimiento_licencia || null,
            vencimiento_psicofisico: rawData.vencimiento_psicofisico || null,
            vencimiento_carga_normal: rawData.vencimiento_carga_normal || null,
            vencimiento_carga_peligrosa: rawData.vencimiento_carga_peligrosa || null,
            estado_general: estadoCalculado,
            notas: rawData.notas || null,
            // URLs
            url_dni: getUrl('archivo_dni'),
            url_licencia: getUrl('archivo_licencia'),
            url_psicofisico: getUrl('archivo_psicofisico'),
            url_curso_carga_normal: getUrl('archivo_curso_carga_normal'),
            url_curso_carga_peligrosa: getUrl('archivo_curso_carga_peligrosa')
        };

        const [newDriverId] = await connection('choferes').insert(driverToSave);
        const createdDriver = await connection('choferes').where({ id: newDriverId }).first();
        const createdDriverWithStatus = {
            ...createdDriver,
            info_completa: verificarInfoCompleta(createdDriver)
        };

        const duration = Date.now() - start;
        logger.info({ event: 'create_driver_success', driverId: newDriverId, duration: `${duration}ms` }, 'Conductor creado');

        res.status(201).json({
            success: true,
            message: 'Chofer creado exitosamente',
            data: createdDriverWithStatus
        });

    } catch (error) {
        await rollbackUploadedFiles(files);

        let statusCode = 500;
        let clientMessage = 'Error interno del servidor.';

        if (error.code === 'ER_DUP_ENTRY') {
            statusCode = 409;
            clientMessage = error.message.includes('dni') 
                ? 'El DNI ingresado ya pertenece a otro chofer registrado.'
                : 'Ya existe un registro con esos datos únicos.';
        }
        
        logger.error({ event: 'create_driver_error', error: error.message });
        res.status(statusCode).json({ success: false, message: clientMessage });
    }
};

export const updateDriver = async (req, res) => {
    const { id } = req.params;
    const start = Date.now();
    const files = req.files || {}; 

    try {
        const currentDriver = await connection('choferes').where({ id }).first();

        if (!currentDriver) {
            await rollbackUploadedFiles(files);
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        const rawData = req.body;

        // Validar DNI duplicado (excluyendo al actual)
        if (rawData.dni && rawData.dni !== currentDriver.dni) {
            const existing = await connection('choferes')
                .where({ dni: rawData.dni })
                .whereNot({ id }) 
                .first();
            
            if (existing) {
                await rollbackUploadedFiles(files);
                return res.status(409).json({
                    success: false,
                    message: `El DNI ${rawData.dni} ya está registrado a nombre de ${existing.nombre} ${existing.apellido}.`
                });
            }
        }
        
        const getNewUrl = (fieldName) => (files[fieldName] && files[fieldName].length > 0) ? files[fieldName][0].path : null;
        const oldFilesToDelete = [];
        const driverToUpdate = {};

        // --- Actualización de campos ---
        if (rawData.nombre) driverToUpdate.nombre = rawData.nombre;
        if (rawData.apellido) driverToUpdate.apellido = rawData.apellido;
        if (rawData.dni) driverToUpdate.dni = rawData.dni;
        if (rawData.notas !== undefined) driverToUpdate.notas = rawData.notas || null;
        
        // Manejo de estado activo/inactivo
        if (rawData.activo !== undefined) {
             const isActive = (rawData.activo === 'true' || rawData.activo === true || rawData.activo === 1 || rawData.activo === '1');
             driverToUpdate.activo = isActive;
             
             // Si lo estamos reactivando, limpiamos la fecha de baja
             if (isActive) {
                 driverToUpdate.fecha_de_baja = null;
             }
        }

        const resolverFecha = (nueva, vieja) => {
            if (nueva === undefined) return vieja; 
            if (nueva === '') return vieja; 
            if (nueva === 'null' || nueva === null) return null; 
            return nueva; 
        };

        const fechasFinales = {
             vencimiento_licencia: resolverFecha(rawData.vencimiento_licencia, currentDriver.vencimiento_licencia),
             vencimiento_psicofisico: resolverFecha(rawData.vencimiento_psicofisico, currentDriver.vencimiento_psicofisico),
             vencimiento_carga_normal: resolverFecha(rawData.vencimiento_carga_normal, currentDriver.vencimiento_carga_normal),
             vencimiento_carga_peligrosa: resolverFecha(rawData.vencimiento_carga_peligrosa, currentDriver.vencimiento_carga_peligrosa)
        };

        driverToUpdate.estado_general = calcularEstadoGeneral(fechasFinales);
        Object.assign(driverToUpdate, fechasFinales);

        // Lógica de reemplazo de archivos
        const procesarArchivo = (campoArchivo, campoUrl, campoEliminar) => {
            const nuevaUrl = getNewUrl(campoArchivo);
            const quiereEliminar = rawData[campoEliminar] === 'true'; 

            if (nuevaUrl) {
                driverToUpdate[campoUrl] = nuevaUrl;
                if (currentDriver[campoUrl]) oldFilesToDelete.push(currentDriver[campoUrl]);
            } else if (quiereEliminar) {
                driverToUpdate[campoUrl] = null;
                if (currentDriver[campoUrl]) oldFilesToDelete.push(currentDriver[campoUrl]);
            }
        };

        procesarArchivo('archivo_dni', 'url_dni', 'eliminar_dni');
        procesarArchivo('archivo_licencia', 'url_licencia', 'eliminar_licencia');
        procesarArchivo('archivo_psicofisico', 'url_psicofisico', 'eliminar_psicofisico');
        procesarArchivo('archivo_curso_carga_normal', 'url_curso_carga_normal', 'eliminar_carga_normal');
        procesarArchivo('archivo_curso_carga_peligrosa', 'url_curso_carga_peligrosa', 'eliminar_carga_peligrosa');

        await connection('choferes').where({ id }).update(driverToUpdate);

        // Eliminar archivos viejos REEMPLAZADOS
        if (oldFilesToDelete.length > 0) {
            await Promise.all(oldFilesToDelete.map(url => deleteFileFromCloudinary(url)));
        }

        const updatedDriver = await connection('choferes').where({ id }).first();
        const updatedDriverWithStatus = {
            ...updatedDriver,
            info_completa: verificarInfoCompleta(updatedDriver)
        };

        const duration = Date.now() - start;
        logger.info({ event: 'update_driver_success', driverId: id, duration: `${duration}ms` }, 'Actualización exitosa');

        res.status(200).json({
            success: true,
            message: 'Conductor actualizado exitosamente',
            data: updatedDriverWithStatus
        });

    } catch (error) {
         await rollbackUploadedFiles(files);
         logger.error({ event: 'update_driver_error', error: error.message }, 'Fallo al actualizar');
         res.status(500).json({message: "Error al actualizar"});
    }
};

export const deleteDriver = async (req, res) => {
    const { id } = req.params;

    try {
        const driverToDelete = await connection('choferes').where({ id }).first();
        if (!driverToDelete) {
            return res.status(404).json({ success: false, message: 'Conductor no encontrado' });
        }

        // --- BAJA LÓGICA ---
        // Marcamos como inactivo y registramos fecha.
        // NO BORRAMOS LOS ARCHIVOS FÍSICOS para mantener el historial intacto.
        
        await connection('choferes')
            .where({ id })
            .update({
                activo: false,
                fecha_de_baja: new Date()
            });

        /* ⚠️ COMENTADO PARA PRESERVAR HISTORIAL:
           Si borras los archivos de Cloudinary, el historial de viajes pasados mostrará errores 404 al intentar ver la licencia antigua.
           Solo descomenta esto si estás seguro de que NUNCA querrás ver los documentos de un chofer dado de baja.
        
        const urlsToDelete = [
            driverToDelete.url_dni,
            driverToDelete.url_licencia,
            driverToDelete.url_psicofisico,
            driverToDelete.url_curso_carga_normal,
            driverToDelete.url_curso_carga_peligrosa
        ].filter(url => url); 

        if (urlsToDelete.length > 0) {
            await Promise.all(urlsToDelete.map(url => deleteFileFromCloudinary(url)));
        } 
        */

        res.status(200).json({
            success: true,
            message: 'Conductor archivado exitosamente. (Archivos conservados para historial)'
        });

    } catch (error) {
        logger.error({ event: 'delete_driver_error', error: error.message }, 'Error al eliminar conductor');
        res.status(500).json({ success: false, message: 'Error interno al eliminar el conductor.' });
    }
};
