import db from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';

const toNumberOrNull = (val) => {
  if (val === null || val === undefined || val === '') return null;
  let raw = typeof val === 'number' ? String(val) : String(val).trim();
  if (!raw) return null;
  raw = raw.replace(/\s+/g, '');

  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (raw.includes('.') && /^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, '');
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.');
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const computePaymentBase = ({ tipo, porcentaje, precio_fijo, valor_neto }) => {
  const net = toNumberOrNull(valor_neto);
  if (tipo === 'FIJO') {
    const fixed = toNumberOrNull(precio_fijo);
    return fixed;
  }
  // PORCENTAJE
  const pct = toNumberOrNull(porcentaje);
  if (net === null || pct === null) return null;
  return (net * pct) / 100;
};

export const getAllDriverPayments = async (req, res) => {
  try {
    const travels = await db('viajes_registrados as v')
      .leftJoin('choferes as d', 'v.chofer_id', 'd.id')
      .leftJoin('empresas as e', 'v.empresa_id', 'e.id')
      .leftJoin('pagos_choferes as p', 'p.viaje_id', 'v.id')
      .select(
        'v.id as viaje_id',
        'v.fecha_viaje',
        'v.remito',
        'v.hoja_ruta',
        'v.numero_proforma',
        'v.origen',
        'v.destino',
        'v.cantidad_cargada',
        'v.cantidad_descargada',
        'v.valor_neto',
        'v.adelanto_monto as adelanto_monto',
        'd.nombre as driver_name',
        'd.apellido as driver_lastname',
        'e.nombre as company_name',
        'p.id as pago_chofer_id',
        'p.tipo as pago_tipo',
        'p.porcentaje as pago_porcentaje',
        'p.precio_fijo as pago_precio_fijo'
      )
      .where('v.anulado', false)
      .orderBy('v.fecha_viaje', 'desc');

    const paymentIds = travels
      .map((t) => t.pago_chofer_id)
      .filter((id) => id !== null && id !== undefined);

    const adjustmentsByPaymentId = new Map();
    if (paymentIds.length > 0) {
      const ajustes = await db('pagos_choferes_ajustes')
        .select('id', 'pago_chofer_id', 'descripcion', 'monto', 'created_at')
        .whereIn('pago_chofer_id', paymentIds)
        .orderBy('created_at', 'asc');

      for (const a of ajustes) {
        const arr = adjustmentsByPaymentId.get(a.pago_chofer_id) ?? [];
        arr.push({
          id: a.id,
          descripcion: a.descripcion,
          monto: toNumberOrNull(a.monto) ?? 0,
          created_at: a.created_at,
        });
        adjustmentsByPaymentId.set(a.pago_chofer_id, arr);
      }
    }

    const rows = travels.map((t) => {
      const tipo = t.pago_tipo || 'PORCENTAJE';
      const porcentaje = t.pago_porcentaje ?? null;
      const precio_fijo = t.pago_precio_fijo ?? null;
      const ajustes = t.pago_chofer_id ? (adjustmentsByPaymentId.get(t.pago_chofer_id) ?? []) : [];
      const ajustes_total = ajustes.reduce((acc, a) => acc + (toNumberOrNull(a.monto) ?? 0), 0);

      const pago_base = computePaymentBase({
        tipo,
        porcentaje,
        precio_fijo,
        valor_neto: t.valor_neto,
      });

      const adelanto_monto = toNumberOrNull(t.adelanto_monto ?? t['v.adelanto_monto']) ?? 0;
      const pago_final = pago_base === null ? null : pago_base + ajustes_total - adelanto_monto;

      return {
        viaje_id: t.viaje_id,
        driver_fullname: `${t.driver_name || ''} ${t.driver_lastname || ''}`.trim() || '-',
        company_name: t.company_name || '-',
        remito: t.remito || null,
        hoja_ruta: t.hoja_ruta || null,
        numero_proforma: t.numero_proforma || null,
        fecha_viaje: t.fecha_viaje,
        origen: t.origen || null,
        destino: t.destino || null,
        cantidad_cargada: toNumberOrNull(t.cantidad_cargada) ?? 0,
        cantidad_descargada: toNumberOrNull(t.cantidad_descargada) ?? 0,
        valor_viaje_neto: toNumberOrNull(t.valor_neto),
        adelanto_monto,
        pago: {
          id: t.pago_chofer_id ?? null,
          tipo,
          porcentaje: toNumberOrNull(porcentaje),
          precio_fijo: toNumberOrNull(precio_fijo),
          ajustes,
          ajustes_total,
          adelanto_monto,
          pago_base,
          pago_final,
        },
      };
    });

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ event: 'get_driver_payments_error', error: error.message, stack: error.stack }, 'Error al obtener pagos de choferes');
    return res.status(500).json({ success: false, message: 'Error al obtener pagos de choferes' });
  }
};

const ensurePaymentRow = async (travelId) => {
  const existing = await db('pagos_choferes').where({ viaje_id: travelId }).first();
  if (existing) return existing;
  const [id] = await db('pagos_choferes').insert({
    viaje_id: travelId,
    tipo: 'PORCENTAJE',
    porcentaje: null,
    precio_fijo: null,
  });
  return db('pagos_choferes').where({ id }).first();
};

export const upsertDriverPaymentConfig = async (req, res) => {
  const travelId = Number(req.params.travelId);
  const { tipo, porcentaje, precio_fijo } = req.body || {};

  if (!Number.isFinite(travelId) || travelId <= 0) {
    return res.status(400).json({ success: false, message: 'travelId inválido' });
  }
  if (tipo !== 'PORCENTAJE' && tipo !== 'FIJO') {
    return res.status(400).json({ success: false, message: 'tipo inválido' });
  }

  const pct = toNumberOrNull(porcentaje);
  const fixed = toNumberOrNull(precio_fijo);

  if (tipo === 'PORCENTAJE') {
    if (pct === null || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, message: 'porcentaje debe estar entre 0 y 100' });
    }
  }
  if (tipo === 'FIJO') {
    if (fixed === null || fixed < 0) {
      return res.status(400).json({ success: false, message: 'precio_fijo debe ser >= 0' });
    }
  }

  try {
    const travel = await db('viajes_registrados').where({ id: travelId }).first();
    if (!travel) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    const existing = await db('pagos_choferes').where({ viaje_id: travelId }).first();

    const payload =
      tipo === 'PORCENTAJE'
        ? { tipo, porcentaje: pct, precio_fijo: null }
        : { tipo, porcentaje: null, precio_fijo: fixed };

    if (existing) {
      await db('pagos_choferes').where({ id: existing.id }).update(payload);
      const updated = await db('pagos_choferes').where({ id: existing.id }).first();
      return res.status(200).json({ success: true, data: updated });
    }

    const [id] = await db('pagos_choferes').insert({ viaje_id: travelId, ...payload });
    const created = await db('pagos_choferes').where({ id }).first();
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ event: 'upsert_driver_payment_config_error', travelId, error: error.message }, 'Error al guardar config pago chofer');
    return res.status(500).json({ success: false, message: 'Error al guardar configuración' });
  }
};

export const addDriverPaymentAdjustment = async (req, res) => {
  const travelId = Number(req.params.travelId);
  const { descripcion, monto } = req.body || {};

  if (!Number.isFinite(travelId) || travelId <= 0) {
    return res.status(400).json({ success: false, message: 'travelId inválido' });
  }
  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'descripcion inválida' });
  }
  const amount = toNumberOrNull(monto);
  if (amount === null || amount === 0) {
    return res.status(400).json({ success: false, message: 'monto inválido (usa + o -)' });
  }

  try {
    const travel = await db('viajes_registrados').where({ id: travelId }).first();
    if (!travel) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    const payment = await ensurePaymentRow(travelId);
    const [id] = await db('pagos_choferes_ajustes').insert({
      pago_chofer_id: payment.id,
      descripcion: descripcion.trim(),
      monto: amount,
    });
    const created = await db('pagos_choferes_ajustes').where({ id }).first();
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ event: 'add_driver_payment_adjustment_error', travelId, error: error.message }, 'Error al crear ajuste');
    return res.status(500).json({ success: false, message: 'Error al crear ajuste' });
  }
};

export const deleteDriverPaymentAdjustment = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'id inválido' });
  }
  try {
    const existing = await db('pagos_choferes_ajustes').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ajuste no encontrado' });
    }
    await db('pagos_choferes_ajustes').where({ id }).del();
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error({ event: 'delete_driver_payment_adjustment_error', id, error: error.message }, 'Error al eliminar ajuste');
    return res.status(500).json({ success: false, message: 'Error al eliminar ajuste' });
  }
};
