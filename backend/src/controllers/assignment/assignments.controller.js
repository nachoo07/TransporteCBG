import connection from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';

// --- OBTENER ASIGNACIONES ACTIVAS (CON NOMBRES Y PATENTES) ---
export const getActiveAssignments = async (req, res) => {
    try {
        const asignaciones = await connection('asignaciones')
            .join('choferes', 'asignaciones.chofer_id', '=', 'choferes.id')
            .join('chasis', 'asignaciones.chasis_id', '=', 'chasis.id')
            .join('acoplado', 'asignaciones.acoplado_id', '=', 'acoplado.id')
            .select(
                'asignaciones.id',
                'asignaciones.created_at as fecha_inicio',
                'asignaciones.fecha_fin',
                'asignaciones.chofer_id',
                'asignaciones.chasis_id',
                'asignaciones.acoplado_id',
                'asignaciones.activo',
                'choferes.nombre as chofer_nombre',
                'choferes.apellido as chofer_apellido',
                'choferes.activo as chofer_activo',
                'chasis.Dominio_chasis',
                'chasis.activo as chasis_activo',
                'acoplado.Dominio_acoplado',
                'acoplado.activo as acoplado_activo'
            )
            .where('asignaciones.activo', true)
            .where('choferes.activo', true)
            .where('chasis.activo', true)
            .where('acoplado.activo', true)
            .orderBy('asignaciones.created_at', 'desc');

        res.status(200).json({ success: true, data: asignaciones, meta: { total: asignaciones.length } });
    } catch (error) {
        logger.error({ error: error.message }, 'Error al obtener asignaciones');
        res.status(500).json({ success: false, message: 'Error interno.' });
    }
};

// --- CREAR NUEVA ASIGNACIÓN (CON VALIDACIÓN DE DISPONIBILIDAD) ---
export const createAssignment = async (req, res) => {
    const { chofer_id, chasis_id, acoplado_id } = req.body;
    const errors = [];

    try {
        const result = await connection.transaction(async (trx) => {
            // 1. Verificar existencia y activos
            const chofer = await trx('choferes').where({ id: chofer_id }).first();
            const chasis = await trx('chasis').where({ id: chasis_id }).first();
            const acoplado = await trx('acoplado').where({ id: acoplado_id }).first();

            if (!chofer || !chasis || !acoplado) {
                if (!chofer) errors.push(`Chofer ${chofer_id} no existe.`);
                if (!chasis) errors.push(`Chasis ID ${chasis_id} no existe.`);
                if (!acoplado) errors.push(`Acoplado ID ${acoplado_id} no existe.`);
                return { ok: false, status: 404 };
            }
            if (!chofer.activo) errors.push(`Chofer ${chofer.nombre} ${chofer.apellido} está inactivo.`);
            if (!chasis.activo) errors.push(`Chasis ${chasis.Dominio_chasis} está inactivo.`);
            if (!acoplado.activo) errors.push(`Acoplado ${acoplado.Dominio_acoplado} está inactivo.`);
            if (errors.length > 0) return { ok: false, status: 409 };

            // 2. Verificar ocupación con lock
            const ocupados = await trx('asignaciones as a')
                .leftJoin('choferes as c', 'a.chofer_id', 'c.id')
                .leftJoin('chasis as ch', 'a.chasis_id', 'ch.id')
                .leftJoin('acoplado as ac', 'a.acoplado_id', 'ac.id')
                .where('a.activo', true)
                .andWhere(builder => {
                    builder.where('a.chofer_id', chofer_id)
                           .orWhere('a.chasis_id', chasis_id)
                           .orWhere('a.acoplado_id', acoplado_id);
                })
                .select(
                    'a.id',
                    'a.chofer_id', 'c.nombre as chofer_nombre', 'c.apellido as chofer_apellido',
                    'a.chasis_id', 'ch.Dominio_chasis',
                    'a.acoplado_id', 'ac.Dominio_acoplado'
                )
                .forUpdate();

            if (ocupados.length > 0) {
                ocupados.forEach(o => {
                    if (o.chofer_id === chofer_id) errors.push(`Chofer ${o.chofer_nombre} ${o.chofer_apellido} ya está asignado (asignación ${o.id}).`);
                    if (o.chasis_id === chasis_id) errors.push(`Chasis ${o.Dominio_chasis} ya está asignado (asignación ${o.id}).`);
                    if (o.acoplado_id === acoplado_id) errors.push(`Acoplado ${o.Dominio_acoplado} ya está asignado (asignación ${o.id}).`);
                });
                return { ok: false, status: 409 };
            }

            const [newId] = await trx('asignaciones').insert({
                chofer_id,
                chasis_id,
                acoplado_id,
                activo: true
            });

            return { ok: true, newId };
        });

        if (!result.ok) {
            const status = result.status || 409;
            return res.status(status).json({ success: false, message: 'Errores de validación', errors });
        }

        res.status(201).json({ success: true, message: 'Asignación creada correctamente', id: result.newId });

    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, 'Error al crear asignación');
        res.status(500).json({ success: false, message: 'Error al procesar la asignación.' });
    }
};

// --- FINALIZAR ASIGNACIÓN (DAR DE BAJA / DESVINCULAR) ---
export const finishAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        const asignacion = await connection('asignaciones').where({ id }).first();
        if (!asignacion) {
            return res.status(404).json({ success: false, message: 'Asignación no encontrada.', errors: [`Asignación ${id} no existe.`] });
        }
        if (!asignacion.activo) {
            return res.status(400).json({ success: false, message: 'Asignación ya estaba finalizada.', errors: [`Asignación ${id} ya está inactiva.`] });
        }

        await connection('asignaciones')
            .where({ id })
            .update({ 
                activo: false,
                fecha_fin: new Date(),
                updated_at: new Date()
            });

        res.status(200).json({ success: true, message: 'Asignación finalizada. Recursos liberados.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al finalizar asignación.' });
    }
};