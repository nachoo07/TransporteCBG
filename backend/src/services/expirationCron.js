import cron from 'node-cron';
import connection from '../db/db.connection.js'; 
import logger from '../utils/pino/logger.js';    
import { calcularEstadoGeneral } from '../utils/generalCondition/driverStatus.js'; 

const procesarVencimientos = async () => {
    logger.info('🕵️ Iniciando revisión masiva de vencimientos (Choferes, Chasis, Acoplados)...');
    
    // ==========================================
    // 1. PROCESAR CHOFERES
    // ==========================================
    try {
        const drivers = await connection('choferes').select('*').where('activo', true);
        const updates = [];

        for (const driver of drivers) {
            // Pasamos solo las fechas que nos importan
            const nuevoEstado = calcularEstadoGeneral({
                l: driver.vencimiento_licencia,
                p: driver.vencimiento_psicofisico,
                cn: driver.vencimiento_carga_normal,
                cp: driver.vencimiento_carga_peligrosa
            });

            if (driver.estado_general !== nuevoEstado) {
                updates.push(connection('choferes').where('id', driver.id).update({ estado_general: nuevoEstado }));
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            logger.warn(`⚠️ Se actualizaron ${updates.length} Choferes.`);
        }
    } catch (error) {
        logger.error({ error: error.message }, '❌ Error Cron Choferes');
    }

    // ==========================================
    // 2. PROCESAR CHASIS 
    // ==========================================
    try {
        const chasisList = await connection('chasis').select('*').where('activo', true);
        const updatesChasis = [];

        for (const item of chasisList) {
            // Pasamos las fechas específicas de Chasis
            const nuevoEstado = calcularEstadoGeneral({
                cedula: item.vencimiento_cedula_chasis,
                vtv: item.vencimiento_vtv_chasis,
                senasa: item.vencimiento_senasa_chasis,
                tipif: item.vencimiento_tipificacion_carga_chasis,
                homol: item.vencimiento_homologacion_chasis
            });

            if (item.estado_general !== nuevoEstado) {
                updatesChasis.push(connection('chasis').where('id', item.id).update({ estado_general: nuevoEstado }));
            }
        }

        if (updatesChasis.length > 0) {
            await Promise.all(updatesChasis);
            logger.warn(`⚠️ Se actualizaron ${updatesChasis.length} Chasis.`);
        }
    } catch (error) {
        logger.error({ error: error.message }, '❌ Error Cron Chasis');
    }

    // ==========================================
    // 3. PROCESAR ACOPLADOS
    // ==========================================
    try {
        const coupledList = await connection('acoplado').select('*').where('activo', true);
        const updatesCoupled = [];

        for (const item of coupledList) {
            // Pasamos las fechas específicas de Acoplados
            // (Asegúrate que los nombres de columnas coincidan con tu DB)
            const nuevoEstado = calcularEstadoGeneral({
                // Ejemplo de nombres comunes, ajusta si tu tabla tiene otros
                cedula: item.vencimiento_cedula_acoplado, 
                vtv: item.vencimiento_vtv_acoplado,
                senasa: item.vencimiento_senasa_acoplado,
                tipif: item.vencimiento_tipificacion_carga_acoplado,
                homol: item.vencimiento_homologacion_acoplado
            });

            if (item.estado_general !== nuevoEstado) {
                updatesCoupled.push(connection('acoplado').where('id', item.id).update({ estado_general: nuevoEstado }));
            }
        }

        if (updatesCoupled.length > 0) {
            await Promise.all(updatesCoupled);
            logger.warn(`⚠️ Se actualizaron ${updatesCoupled.length} Acoplados.`);
        }
    } catch (error) {
        logger.error({ error: error.message }, '❌ Error Cron Acoplados');
    }
};

export const iniciarCronJobs = () => {
    // Ejecutar todos los días a las 08:00 AM
    cron.schedule('0 8 * * *', () => {
        procesarVencimientos();
    });

    logger.info('⏰ Cron Jobs de Vencimientos Activos (08:00 AM)');
    
    // Descomenta esto para probarlo al reiniciar el servidor
    // setTimeout(procesarVencimientos, 5000);
};