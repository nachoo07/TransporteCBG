import db from '../../db/db.connection.js';
import logger from '../../utils/pino/logger.js';
import { cloudinaryInstance } from '../../../files/cloudinary.js';
import { deleteFileFromCloudinary } from '../../../files/deleteFileCloudinary.js';

// Helper para formatear fechas sin problemas de timezone
const formatDateForDB = (dateString) => {
  if (!dateString) return null;
  
  // Si ya es string 'YYYY-MM-DD', devolverlo tal cual
  if (typeof dateString === 'string') {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  
  // SOLUCIÓN AQUÍ: Usamos métodos UTC (getUTCDate) en lugar de locales (getDate)
  if (dateString instanceof Date) {
    const year = dateString.getUTCFullYear(); // UTC
    const month = String(dateString.getUTCMonth() + 1).padStart(2, '0'); // UTC
    const day = String(dateString.getUTCDate()).padStart(2, '0'); // UTC
    return `${year}-${month}-${day}`;
  }
  
  return null;
};

// Helper para formatear fecha al leer de DB
const formatDateFromDB = (dateValue) => {
  if (!dateValue) return null;
  // Si viene como string 'YYYY-MM-DD', cortarlo
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    return dateValue.split('T')[0];
  }
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateValue;
};

const parseLocaleNumber = (value) => {
  if (value === null || value === undefined || value === '') return Number.NaN;
  if (typeof value === 'number') return value;
  let raw = String(value).trim();
  if (!raw) return Number.NaN;
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
  if (!Number.isNaN(parsed)) return parsed;
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? Number(digits) : Number.NaN;
};

const rollbackUploadedFiles = async (files) => {
  const fileKeys = Object.keys(files);
  if (fileKeys.length > 0) {
    await Promise.all(
      fileKeys.map(key => {
        const f = files[key][0];
        const isPdf = f.mimetype === 'application/pdf';
        return cloudinaryInstance.uploader.destroy(f.filename, { 
          resource_type: isPdf ? 'raw' : 'image' 
        });
      })
    );
    logger.info('🗑️ Rollback: Uploaded files deleted due to transaction error');
  }
};

const normalizeState = (value, fallback) => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized || fallback;
};

const hasValue = (value) => String(value ?? '').trim().length > 0;

const deriveInvoiceState = ({ invoiceNumber, invoiceDate, currentState }) => {
  const explicit = normalizeState(currentState, '');
  if (explicit) return explicit;
  return hasValue(invoiceNumber) && hasValue(invoiceDate) ? 'FACTURADO' : 'FALTA';
};

const deriveLiquidationState = ({ cartaDePorte, currentState }) => {
  const explicit = normalizeState(currentState, '');
  if (explicit) return explicit;
  return hasValue(cartaDePorte) ? 'LIQUIDADO' : 'FALTA';
};

const deriveGeneralState = ({ liquidationState, invoiceState, paymentState }) => {
  if (
    normalizeState(liquidationState, 'FALTA') !== 'FALTA' &&
    normalizeState(invoiceState, 'FALTA') !== 'FALTA' &&
    normalizeState(paymentState, 'DEBEN') !== 'DEBEN'
  ) {
    return 'COMPLETO';
  }
  return 'INCOMPLETO';
};

export const createTravel = async (req, res) => {
  const startTime = Date.now();
  const files = req.files || {};

  try {
    const data = req.body;

    // Obtener URL de factura desde Cloudinary (multer-storage-cloudinary)
    let invoicePhotoUrl = null;
    if (files.invoice_photo && files.invoice_photo[0]) {
      invoicePhotoUrl = files.invoice_photo[0].path;
    }

    // Archivo de liquidación (lo envía la empresa)
    let archivoFacturaLiquidadoUrl = null;
    if (files.archivo_factura_liquidado && files.archivo_factura_liquidado[0]) {
      archivoFacturaLiquidadoUrl = files.archivo_factura_liquidado[0].path;
    }

    // Evidencias de combustible/KM
    let fotoKmInicioUrl = null;
    if (files.foto_km_inicio && files.foto_km_inicio[0]) {
      fotoKmInicioUrl = files.foto_km_inicio[0].path;
    }
    let fotoKmFinUrl = null;
    if (files.foto_km_fin && files.foto_km_fin[0]) {
      fotoKmFinUrl = files.foto_km_fin[0].path;
    }
    let fotoFacturaCombustibleUrl = null;
    if (files.foto_factura_combustible && files.foto_factura_combustible[0]) {
      fotoFacturaCombustibleUrl = files.foto_factura_combustible[0].path;
    }

    // Preparar objeto para insertar
    const formattedDate = formatDateForDB(data.travel_date);
    const formattedInvoiceDate = formatDateForDB(data.invoice_date);
    const invoiceState = deriveInvoiceState({
      invoiceNumber: data.invoice_number,
      invoiceDate: formattedInvoiceDate,
      currentState: data.invoice_status,
    });
    const liquidationState = deriveLiquidationState({
      cartaDePorte: data.carta_de_porte,
      currentState: data.liquidation_status,
    });
    const paymentState = normalizeState(data.payment_status, 'DEBEN');
    const generalState = deriveGeneralState({
      liquidationState,
      invoiceState,
      paymentState,
    });

    const newTravel = {
      fecha_viaje: formattedDate ? db.raw('?', [formattedDate]) : null,
      
      // Foreign Keys
      chofer_id: data.driver_id || null,
      chasis_id: data.chassis_id || null,
      acoplado_id: data.coupled_id || null,
      empresa_id: data.company_id || null,

      // Documentation
      remito: data.receipt_number || null,
      hoja_ruta: data.route_sheet || null,
      numero_proforma: data.proforma_number || null,
      especiales: data.special_notes || null,

      // Logistics
      origen: data.origin || null,
      destino: data.destination || null,
      cantidad_cargada: parseLocaleNumber(data.quantity_loaded) || 0,
      cantidad_descargada: parseLocaleNumber(data.quantity_unloaded) || 0,

      // Tariffs & Values
      tarifa_valor: data.tariff_value ? parseLocaleNumber(data.tariff_value) : null,
      valor_neto: data.net_value ? parseLocaleNumber(data.net_value) : null,
      valor_iva: data.iva_value ? parseLocaleNumber(data.iva_value) : null,
      precio_fijo: data.fixed_price ? parseLocaleNumber(data.fixed_price) : null,

      // Invoice
      numero_factura: data.invoice_number || null,
      foto_factura: invoicePhotoUrl,
      fecha_facturada: formattedInvoiceDate ? db.raw('?', [formattedInvoiceDate]) : null,

      // Liquidación
      carta_de_porte: data.carta_de_porte || null,
      archivo_factura_liquidado: archivoFacturaLiquidadoUrl,

      // Advances
      adelanto_monto: parseLocaleNumber(data.advance_amount) || 0,
      adelanto_metodo: data.advance_method || null,
      adelanto_responsable: data.advance_responsible || null,

      // Fuel
      estacion_nombre: data.fuel_station || null,
      combustible_litros: parseLocaleNumber(data.fuel_liters) || 0,
      combustible_monto: parseLocaleNumber(data.fuel_amount) || 0,
      factura_combustible: data.fuel_invoice || null,
      combustible_km: data.fuel_km ? parseLocaleNumber(data.fuel_km) : null,
      combustible_km_fin: data.fuel_km_end ? parseLocaleNumber(data.fuel_km_end) : null,
      foto_km_inicio: fotoKmInicioUrl,
      foto_km_fin: fotoKmFinUrl,
      foto_factura_combustible: fotoFacturaCombustibleUrl,

      // States
      estado_liquidacion: liquidationState,
      orden_pago: data.payment_order || null,
      estado_facturacion: invoiceState,
      estado_pago: paymentState,
      estado_general: generalState,
      anulado: false,
      anulado_motivo: null,
      anulado_at: null,
      anulado_by_user_id: null,
    };

    // Insertar en BD
    const [id] = await db('viajes_registrados').insert(newTravel);

    // Traer viaje con joins para devolver datos completos al front
    const createdTravel = await db('viajes_registrados')
      .leftJoin('choferes', 'viajes_registrados.chofer_id', 'choferes.id')
      .leftJoin('empresas', 'viajes_registrados.empresa_id', 'empresas.id')
      .leftJoin('chasis', 'viajes_registrados.chasis_id', 'chasis.id')
      .leftJoin('acoplado', 'viajes_registrados.acoplado_id', 'acoplado.id')
      .select(
        'viajes_registrados.*',
        'choferes.nombre as driver_name',
        'choferes.apellido as driver_lastname',
        'empresas.nombre as company_name',
        'chasis.Dominio_chasis as chassis_domain',
        'acoplado.Dominio_acoplado as coupled_domain'
      )
      .where('viajes_registrados.id', id)
      .first();

    // Formatear fecha antes de enviar (Asegúrate de tener esto aplicado)
    if (createdTravel) {
        createdTravel.fecha_viaje = formatDateFromDB(createdTravel.fecha_viaje);
        createdTravel.fecha_facturada = formatDateFromDB(createdTravel.fecha_facturada);
    }

    logger.info({ event: 'create_travel_success', travelId: id, duration: `${Date.now() - startTime}ms` }, 'Travel registered');
    res.status(201).json({ 
      success: true, 
      message: 'Travel registered successfully', 
      data: createdTravel
    });

  } catch (error) {
    // Rollback archivos si hubo error
    if (Object.keys(files).length > 0) {
      await rollbackUploadedFiles(files);
    }
    logger.error({ event: 'create_travel_error', error: error.message, stack: error.stack }, 'Error registering travel');
    res.status(500).json({ success: false, message: 'Error registering travel' });
  }
};

export const getAllTravels = async (req, res) => {
  const startTime = Date.now();

  try {
    const includeAnnulled =
      String(req.query?.includeAnnulled || '').toLowerCase() === 'true' ||
      String(req.query?.includeAnnulled || '') === '1';

    const travels = await db('viajes_registrados')
      .leftJoin('choferes', 'viajes_registrados.chofer_id', 'choferes.id')
      .leftJoin('empresas', 'viajes_registrados.empresa_id', 'empresas.id')
      .leftJoin('chasis', 'viajes_registrados.chasis_id', 'chasis.id')
      .leftJoin('acoplado', 'viajes_registrados.acoplado_id', 'acoplado.id')
      .select(
        'viajes_registrados.*',
        'choferes.nombre as driver_name',
        'choferes.apellido as driver_lastname',
        'empresas.nombre as company_name',
        'chasis.Dominio_chasis as chassis_domain',
        'acoplado.Dominio_acoplado as coupled_domain'
      )
      .modify((qb) => {
        if (!includeAnnulled) qb.where('viajes_registrados.anulado', false);
      })
      .orderBy('viajes_registrados.fecha_viaje', 'desc');

    // Formatear fechas antes de enviar
    const formattedTravels = travels.map(t => ({
      ...t,
      fecha_viaje: formatDateFromDB(t.fecha_viaje),
      fecha_facturada: formatDateFromDB(t.fecha_facturada),
      anulado_at: formatDateFromDB(t.anulado_at),
    }));

    const duration = Date.now() - startTime;
    logger.info({ event: 'get_travels_success', count: travels.length, duration: `${duration}ms` }, 'Travels retrieved');
    
    res.status(200).json({ success: true, data: formattedTravels });
  } catch (error) {
    logger.error({ event: 'get_travels_error', error: error.message }, 'Error retrieving travels');
    res.status(500).json({ success: false, message: 'Error retrieving travels' });
  }
};

export const getTravelById = async (req, res) => {
  try {
    const { id } = req.params;

    const travel = await db('viajes_registrados')
      .leftJoin('choferes', 'viajes_registrados.chofer_id', 'choferes.id')
      .leftJoin('empresas', 'viajes_registrados.empresa_id', 'empresas.id')
      .leftJoin('chasis', 'viajes_registrados.chasis_id', 'chasis.id')
      .leftJoin('acoplado', 'viajes_registrados.acoplado_id', 'acoplado.id')
      .select(
        'viajes_registrados.*',
        'choferes.nombre as driver_name',
        'choferes.apellido as driver_lastname',
        'empresas.nombre as company_name',
        'chasis.Dominio_chasis as chassis_domain',
        'acoplado.Dominio_acoplado as coupled_domain'
      )
      .where('viajes_registrados.id', id)
      .first();

    if (!travel) {
      return res.status(404).json({ success: false, message: 'Travel not found' });
    }

    // Formatear fecha antes de enviar
    travel.fecha_viaje = formatDateFromDB(travel.fecha_viaje);
    travel.fecha_facturada = formatDateFromDB(travel.fecha_facturada);

    res.status(200).json({ success: true, data: travel });
  } catch (error) {
    logger.error({ event: 'get_travel_error', error: error.message }, 'Error retrieving travel');
    res.status(500).json({ success: false, message: 'Error retrieving travel' });
  }
};

export const updateTravel = async (req, res) => {
  const startTime = Date.now();
  const { id } = req.params;
  const data = req.body;
  const files = req.files || {};

  try {
    // Obtener viaje actual
    const currentTravel = await db('viajes_registrados').where({ id }).first();

    if (!currentTravel) {
      if (Object.keys(files).length > 0) {
        await rollbackUploadedFiles(files);
      }
      return res.status(404).json({ success: false, message: 'Travel not found' });
    }

    // Helpers para permitir borrar valores (vacíos -> null) y números opcionales
    const toNullIfEmpty = (val) => (val === undefined ? undefined : val === '' ? null : val);
    const numberOrNull = (val) => {
      if (val === undefined) return undefined;
      const parsed = parseLocaleNumber(val);
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Preparar actualización (usa undefined para no tocar, null para limpiar)
    const formattedUpdateDate = data.travel_date ? formatDateForDB(data.travel_date) : undefined;
    const formattedUpdateInvoiceDate = data.invoice_date ? formatDateForDB(data.invoice_date) : undefined;
    const foreignKeyOrNull = (val) => (val === undefined ? undefined : val === '' ? null : val);

    const travelToUpdate = {
      fecha_viaje: formattedUpdateDate ? db.raw('?', [formattedUpdateDate]) : undefined,
      fecha_facturada: formattedUpdateInvoiceDate ? db.raw('?', [formattedUpdateInvoiceDate]) : (data.invoice_date === null ? null : undefined),
      chofer_id: foreignKeyOrNull(data.driver_id),
      chasis_id: foreignKeyOrNull(data.chassis_id),
      acoplado_id: foreignKeyOrNull(data.coupled_id),
      empresa_id: foreignKeyOrNull(data.company_id),

      remito: toNullIfEmpty(data.receipt_number),
      hoja_ruta: toNullIfEmpty(data.route_sheet),
      numero_proforma: toNullIfEmpty(data.proforma_number),
      especiales: toNullIfEmpty(data.special_notes),

      origen: toNullIfEmpty(data.origin),
      destino: toNullIfEmpty(data.destination),
      cantidad_cargada: numberOrNull(data.quantity_loaded),
      cantidad_descargada: numberOrNull(data.quantity_unloaded),

      tarifa_valor: numberOrNull(data.tariff_value),
      valor_neto: numberOrNull(data.net_value),
      valor_iva: numberOrNull(data.iva_value),
      precio_fijo: numberOrNull(data.fixed_price),

      numero_factura: toNullIfEmpty(data.invoice_number),
      carta_de_porte: toNullIfEmpty(data.carta_de_porte),
      adelanto_monto: numberOrNull(data.advance_amount),
      adelanto_metodo: toNullIfEmpty(data.advance_method),
      adelanto_responsable: toNullIfEmpty(data.advance_responsible),

      estacion_nombre: toNullIfEmpty(data.fuel_station),
      combustible_litros: numberOrNull(data.fuel_liters),
      combustible_monto: numberOrNull(data.fuel_amount),
      factura_combustible: toNullIfEmpty(data.fuel_invoice),
      combustible_km: numberOrNull(data.fuel_km),
      combustible_km_fin: numberOrNull(data.fuel_km_end),
      orden_pago: toNullIfEmpty(data.payment_order),
    };

    // Eliminar claves en undefined para que Knex no las actualice
    Object.keys(travelToUpdate).forEach((key) => {
      if (travelToUpdate[key] === undefined) {
        delete travelToUpdate[key];
      }
    });
    if (files.invoice_photo && files.invoice_photo[0]) {
      // Eliminar foto anterior si existe
      if (currentTravel.foto_factura) {
        await deleteFileFromCloudinary(currentTravel.foto_factura);
      }
      travelToUpdate.foto_factura = files.invoice_photo[0].path;
    } else if (data.delete_invoice_photo === 'true' && currentTravel.foto_factura) {
      // Eliminar foto si se solicitó
      await deleteFileFromCloudinary(currentTravel.foto_factura);
      travelToUpdate.foto_factura = null;
    }

    if (files.archivo_factura_liquidado && files.archivo_factura_liquidado[0]) {
      if (currentTravel.archivo_factura_liquidado) {
        await deleteFileFromCloudinary(currentTravel.archivo_factura_liquidado);
      }
      travelToUpdate.archivo_factura_liquidado = files.archivo_factura_liquidado[0].path;
    } else if (data.delete_liquidation_file === 'true' && currentTravel.archivo_factura_liquidado) {
      await deleteFileFromCloudinary(currentTravel.archivo_factura_liquidado);
      travelToUpdate.archivo_factura_liquidado = null;
    }

    if (files.foto_km_inicio && files.foto_km_inicio[0]) {
      if (currentTravel.foto_km_inicio) {
        await deleteFileFromCloudinary(currentTravel.foto_km_inicio);
      }
      travelToUpdate.foto_km_inicio = files.foto_km_inicio[0].path;
    }

    if (files.foto_km_fin && files.foto_km_fin[0]) {
      if (currentTravel.foto_km_fin) {
        await deleteFileFromCloudinary(currentTravel.foto_km_fin);
      }
      travelToUpdate.foto_km_fin = files.foto_km_fin[0].path;
    }

    if (files.foto_factura_combustible && files.foto_factura_combustible[0]) {
      if (currentTravel.foto_factura_combustible) {
        await deleteFileFromCloudinary(currentTravel.foto_factura_combustible);
      }
      travelToUpdate.foto_factura_combustible = files.foto_factura_combustible[0].path;
    } else if (data.delete_fuel_invoice_photo === 'true' && currentTravel.foto_factura_combustible) {
      await deleteFileFromCloudinary(currentTravel.foto_factura_combustible);
      travelToUpdate.foto_factura_combustible = null;
    }

    const nextInvoiceNumber =
      travelToUpdate.numero_factura !== undefined ? travelToUpdate.numero_factura : currentTravel.numero_factura;
    const nextInvoiceDate =
      travelToUpdate.fecha_facturada !== undefined
        ? (formattedUpdateInvoiceDate ?? null)
        : formatDateFromDB(currentTravel.fecha_facturada);
    const nextCartaDePorte =
      travelToUpdate.carta_de_porte !== undefined ? travelToUpdate.carta_de_porte : currentTravel.carta_de_porte;
    const nextPaymentState = normalizeState(
      data.payment_status !== undefined ? data.payment_status : currentTravel.estado_pago,
      'DEBEN',
    );

    travelToUpdate.estado_facturacion = deriveInvoiceState({
      invoiceNumber: nextInvoiceNumber,
      invoiceDate: nextInvoiceDate,
      currentState: data.invoice_status,
    });
    travelToUpdate.estado_liquidacion = deriveLiquidationState({
      cartaDePorte: nextCartaDePorte,
      currentState: data.liquidation_status,
    });
    travelToUpdate.estado_pago = nextPaymentState;
    travelToUpdate.estado_general =
      data.general_status ??
      deriveGeneralState({
        liquidationState: travelToUpdate.estado_liquidacion,
        invoiceState: travelToUpdate.estado_facturacion,
        paymentState: travelToUpdate.estado_pago,
      });

    // Actualizar en BD
    await db('viajes_registrados').where({ id }).update(travelToUpdate);

    // Traer viaje actualizado con joins para devolver datos completos y limpios
    const updatedTravel = await db('viajes_registrados')
      .leftJoin('choferes', 'viajes_registrados.chofer_id', 'choferes.id')
      .leftJoin('empresas', 'viajes_registrados.empresa_id', 'empresas.id')
      .leftJoin('chasis', 'viajes_registrados.chasis_id', 'chasis.id')
      .leftJoin('acoplado', 'viajes_registrados.acoplado_id', 'acoplado.id')
      .select(
        'viajes_registrados.*',
        'choferes.nombre as driver_name',
        'choferes.apellido as driver_lastname',
        'empresas.nombre as company_name',
        'chasis.Dominio_chasis as chassis_domain',
        'acoplado.Dominio_acoplado as coupled_domain'
      )
      .where('viajes_registrados.id', id)
      .first();

    // Formatear fecha antes de enviar
    if (updatedTravel) {
      updatedTravel.fecha_viaje = formatDateFromDB(updatedTravel.fecha_viaje);
      updatedTravel.fecha_facturada = formatDateFromDB(updatedTravel.fecha_facturada);
    }

    const duration = Date.now() - startTime;
    logger.info({ event: 'update_travel_success', travelId: id, duration: `${duration}ms` }, 'Travel updated');

    res.status(200).json({ success: true, message: 'Travel updated successfully', data: updatedTravel });
  } catch (error) {
    if (Object.keys(files).length > 0) {
      await rollbackUploadedFiles(files);
    }
    logger.error({ event: 'update_travel_error', travelId: id, error: error.message }, 'Error updating travel');
    res.status(500).json({ success: false, message: 'Error updating travel' });
  }
};

export const bulkDocsUpdate = async (req, res) => {
  const startTime = Date.now();
  const data = req.body || {};
  const files = req.files || {};

  try {
    let idsRaw;
    try {
      idsRaw = JSON.parse(data.ids);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid ids format' });
    }

    if (!Array.isArray(idsRaw)) {
      return res.status(400).json({ success: false, message: 'ids must be an array' });
    }

    const ids = Array.from(
      new Set(
        idsRaw
          .map((v) => Number.parseInt(String(v), 10))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    );

    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids is empty' });
    }

    const currentTravels = await db('viajes_registrados')
      .select('id', 'empresa_id', 'anulado', 'foto_factura', 'archivo_factura_liquidado')
      .whereIn('id', ids);

    const found = new Set(currentTravels.map((t) => Number(t.id)));
    const missingIds = ids.filter((id) => !found.has(id));
    if (missingIds.length > 0) {
      if (Object.keys(files).length > 0) {
        await rollbackUploadedFiles(files);
      }
      return res.status(404).json({ success: false, message: 'Some travels were not found', missingIds });
    }

    const annulledIds = currentTravels.filter((t) => Boolean(t.anulado)).map((t) => t.id);
    if (annulledIds.length > 0) {
      if (Object.keys(files).length > 0) {
        await rollbackUploadedFiles(files);
      }
      return res.status(400).json({ success: false, message: 'Selection includes annulled travels', annulledIds });
    }

    const companyIds = new Set(currentTravels.map((t) => String(t.empresa_id ?? '')));
    companyIds.delete('');
    if (companyIds.size > 1) {
      if (Object.keys(files).length > 0) {
        await rollbackUploadedFiles(files);
      }
      return res.status(400).json({ success: false, message: 'Selection mixes different companies' });
    }

    const updateData = {};
    const hasInvoiceNumber = typeof data.invoice_number === 'string' && data.invoice_number.trim().length > 0;
    const hasCartaPorte = typeof data.carta_de_porte === 'string' && data.carta_de_porte.trim().length > 0;

    if (data.invoice_date) {
      const formatted = formatDateForDB(data.invoice_date);
      if (!formatted) {
        if (Object.keys(files).length > 0) {
          await rollbackUploadedFiles(files);
        }
        return res.status(400).json({ success: false, message: 'Invalid invoice_date' });
      }
      updateData.fecha_facturada = db.raw('?', [formatted]);
    }

    if (hasInvoiceNumber) updateData.numero_factura = data.invoice_number.trim();
    if (hasCartaPorte) updateData.carta_de_porte = data.carta_de_porte.trim();

    const oldInvoiceUrls = new Set();
    if (files.invoice_photo && files.invoice_photo[0]) {
      updateData.foto_factura = files.invoice_photo[0].path;
      currentTravels.forEach((t) => {
        if (t.foto_factura) oldInvoiceUrls.add(t.foto_factura);
      });
    }

    const oldLiquidationUrls = new Set();
    if (files.archivo_factura_liquidado && files.archivo_factura_liquidado[0]) {
      updateData.archivo_factura_liquidado = files.archivo_factura_liquidado[0].path;
      currentTravels.forEach((t) => {
        if (t.archivo_factura_liquidado) oldLiquidationUrls.add(t.archivo_factura_liquidado);
      });
    }

    const hasInvoiceSignal = hasInvoiceNumber || Boolean(files.invoice_photo && files.invoice_photo[0]) || Boolean(data.invoice_date);
    const hasLiquidationSignal = hasCartaPorte || Boolean(files.archivo_factura_liquidado && files.archivo_factura_liquidado[0]);

    if (data.invoice_status || hasInvoiceSignal) {
      updateData.estado_facturacion = deriveInvoiceState({
        invoiceNumber: hasInvoiceNumber ? data.invoice_number.trim() : null,
        invoiceDate: data.invoice_date ? formatDateForDB(data.invoice_date) : null,
        currentState: data.invoice_status || (hasInvoiceSignal ? 'FACTURADO' : ''),
      });
    }
    if (data.liquidation_status || hasLiquidationSignal) {
      updateData.estado_liquidacion = deriveLiquidationState({
        cartaDePorte: hasCartaPorte ? data.carta_de_porte.trim() : null,
        currentState: data.liquidation_status || (hasLiquidationSignal ? 'LIQUIDADO' : ''),
      });
    }

    if (Object.keys(updateData).length === 0) {
      if (Object.keys(files).length > 0) {
        await rollbackUploadedFiles(files);
      }
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    await db.transaction(async (trx) => {
      await trx('viajes_registrados').whereIn('id', ids).update(updateData);

      const refreshedRows = await trx('viajes_registrados')
        .select('id', 'estado_liquidacion', 'estado_facturacion', 'estado_pago')
        .whereIn('id', ids);

      await Promise.all(
        refreshedRows.map((row) =>
          trx('viajes_registrados')
            .where({ id: row.id })
            .update({
              estado_general: deriveGeneralState({
                liquidationState: row.estado_liquidacion,
                invoiceState: row.estado_facturacion,
                paymentState: row.estado_pago,
              }),
            }),
        ),
      );
    });

    await Promise.all([
      ...Array.from(oldInvoiceUrls).map((url) =>
        url === updateData.foto_factura ? null : deleteFileFromCloudinary(url),
      ),
      ...Array.from(oldLiquidationUrls).map((url) =>
        url === updateData.archivo_factura_liquidado ? null : deleteFileFromCloudinary(url),
      ),
    ]);

    const duration = Date.now() - startTime;
    logger.info({ event: 'bulk_docs_update_success', idsCount: ids.length, duration: `${duration}ms` }, 'Bulk docs update');

    return res.status(200).json({ success: true, updatedCount: ids.length, ids });
  } catch (error) {
    if (Object.keys(files).length > 0) {
      await rollbackUploadedFiles(files);
    }
    logger.error({ event: 'bulk_docs_update_error', error: error.message }, 'Error bulk updating travel docs');
    return res.status(500).json({ success: false, message: 'Error bulk updating travel docs' });
  }
};

export const deleteTravel = async (req, res) => {
  const { id } = req.params;

  try {
    const travel = await db('viajes_registrados').where({ id }).first();

    if (!travel) {
      return res.status(404).json({ success: false, message: 'Travel not found' });
    }

    const hasBillingOrPayment =
      travel.estado_facturacion === 'FACTURADO' ||
      travel.numero_factura ||
      travel.foto_factura ||
      travel.fecha_facturada ||
      travel.orden_pago ||
      travel.estado_pago === 'PAGADO' ||
      travel.estado_liquidacion === 'LIQUIDADO';

    // Regla de seguridad de historial:
    // Si el viaje tiene señales de facturación/pago, no se permite eliminación permanente.
    if (hasBillingOrPayment) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar este viaje porque ya tiene facturación/pago asociado. Use "Anular" para conservar el historial.',
      });
    }

    // Eliminar foto de factura si existe
    if (travel.foto_factura) {
      await deleteFileFromCloudinary(travel.foto_factura);
    }

    // Eliminar viaje
    await db('viajes_registrados').where({ id }).del();

    logger.info({ event: 'delete_travel_success', travelId: id }, 'Travel deleted');
    res.status(200).json({ success: true, message: 'Travel deleted successfully' });
  } catch (error) {
    logger.error({ event: 'delete_travel_error', travelId: id, error: error.message }, 'Error deleting travel');
    res.status(500).json({ success: false, message: 'Error deleting travel' });
  }
};

export const cancelTravel = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body || {};

  if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Motivo requerido (mínimo 3 caracteres).' });
  }

  try {
    const travel = await db('viajes_registrados').where({ id }).first();
    if (!travel) {
      return res.status(404).json({ success: false, message: 'Travel not found' });
    }

    if (travel.anulado) {
      return res.status(400).json({ success: false, message: 'El viaje ya está anulado.' });
    }

    await db('viajes_registrados')
      .where({ id })
      .update({
        anulado: true,
        anulado_motivo: motivo.trim(),
        anulado_at: new Date(),
        anulado_by_user_id: req.user?.id ?? null,
        updated_at: new Date(),
      });

    const updated = await db('viajes_registrados').where({ id }).first();
    return res.status(200).json({ success: true, message: 'Viaje anulado', data: updated });
  } catch (error) {
    logger.error({ event: 'cancel_travel_error', travelId: id, error: error.message }, 'Error canceling travel');
    return res.status(500).json({ success: false, message: 'Error al anular viaje' });
  }
};

export const restoreCanceledTravel = async (req, res) => {
  const { id } = req.params;
  try {
    const travel = await db('viajes_registrados').where({ id }).first();
    if (!travel) {
      return res.status(404).json({ success: false, message: 'Travel not found' });
    }
    if (!travel.anulado) {
      return res.status(400).json({ success: false, message: 'El viaje no está anulado.' });
    }

    await db('viajes_registrados')
      .where({ id })
      .update({
        anulado: false,
        anulado_motivo: null,
        anulado_at: null,
        anulado_by_user_id: null,
        updated_at: new Date(),
      });

    const updated = await db('viajes_registrados').where({ id }).first();
    return res.status(200).json({ success: true, message: 'Viaje restaurado', data: updated });
  } catch (error) {
    logger.error({ event: 'restore_travel_error', travelId: id, error: error.message }, 'Error restoring travel');
    return res.status(500).json({ success: false, message: 'Error al restaurar viaje' });
  }
};
