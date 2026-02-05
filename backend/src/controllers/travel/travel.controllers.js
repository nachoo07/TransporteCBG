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

    // Preparar objeto para insertar
    const formattedDate = formatDateForDB(data.travel_date);
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
      cantidad_cargada: parseFloat(data.quantity_loaded) || 0,
      cantidad_descargada: parseFloat(data.quantity_unloaded) || 0,

      // Tariffs & Values
      tarifa_valor: data.tariff_value ? parseFloat(data.tariff_value) : null,
      valor_neto: data.net_value ? parseFloat(data.net_value) : null,
      valor_iva: data.iva_value ? parseFloat(data.iva_value) : null,
      precio_fijo: data.fixed_price ? parseFloat(data.fixed_price) : null,

      // Invoice
      numero_factura: data.invoice_number || null,
      foto_factura: invoicePhotoUrl,

      // Advances
      adelanto_monto: parseFloat(data.advance_amount) || 0,
      adelanto_metodo: data.advance_method || null,
      adelanto_responsable: data.advance_responsible || null,

      // Fuel
      estacion_nombre: data.fuel_station || null,
      combustible_litros: parseFloat(data.fuel_liters) || 0,
      combustible_monto: parseFloat(data.fuel_amount) || 0,
      combustible_km: data.fuel_km ? parseFloat(data.fuel_km) : null,

      // States
      estado_liquidacion: data.liquidation_status || 'FALTA',
      orden_pago: data.payment_order || null,
      estado_facturacion: data.invoice_status || 'FALTA',
      estado_pago: data.payment_status || 'DEBEN',
      estado_general: 'INCOMPLETO'
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
      .orderBy('viajes_registrados.fecha_viaje', 'desc');

    // Formatear fechas antes de enviar
    const formattedTravels = travels.map(t => ({
      ...t,
      fecha_viaje: formatDateFromDB(t.fecha_viaje)
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
      const parsed = parseFloat(val);
      return Number.isNaN(parsed) ? null : parsed;
    };

    // Preparar actualización (usa undefined para no tocar, null para limpiar)
    const formattedUpdateDate = data.travel_date ? formatDateForDB(data.travel_date) : undefined;
    const travelToUpdate = {
      fecha_viaje: formattedUpdateDate ? db.raw('?', [formattedUpdateDate]) : undefined,
      chofer_id: data.driver_id ?? null,
      chasis_id: data.chassis_id ?? null,
      acoplado_id: data.coupled_id ?? null,
      empresa_id: data.company_id ?? null,

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
      adelanto_monto: numberOrNull(data.advance_amount),
      adelanto_metodo: toNullIfEmpty(data.advance_method),
      adelanto_responsable: toNullIfEmpty(data.advance_responsible),

      estacion_nombre: toNullIfEmpty(data.fuel_station),
      combustible_litros: numberOrNull(data.fuel_liters),
      combustible_monto: numberOrNull(data.fuel_amount),
      combustible_km: numberOrNull(data.fuel_km),

      estado_liquidacion: data.liquidation_status ?? undefined,
      orden_pago: toNullIfEmpty(data.payment_order),
      estado_facturacion: data.invoice_status ?? undefined,
      estado_pago: data.payment_status ?? undefined,
      estado_general: data.general_status ?? undefined,
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

    if (data.advance_amount !== undefined) travelToUpdate.adelanto_monto = parseFloat(data.advance_amount);
    if (data.advance_method) travelToUpdate.adelanto_metodo = data.advance_method;
    if (data.advance_responsible) travelToUpdate.adelanto_responsable = data.advance_responsible;

    if (data.fuel_station) travelToUpdate.estacion_nombre = data.fuel_station;
    if (data.fuel_liters !== undefined) travelToUpdate.combustible_litros = parseFloat(data.fuel_liters);
    if (data.fuel_amount !== undefined) travelToUpdate.combustible_monto = parseFloat(data.fuel_amount);
    if (data.fuel_km) travelToUpdate.combustible_km = parseFloat(data.fuel_km);

    if (data.liquidation_status) travelToUpdate.estado_liquidacion = data.liquidation_status;
    if (data.payment_order) travelToUpdate.orden_pago = data.payment_order;
    if (data.invoice_status) travelToUpdate.estado_facturacion = data.invoice_status;
    if (data.payment_status) travelToUpdate.estado_pago = data.payment_status;
    if (data.general_status) travelToUpdate.estado_general = data.general_status;

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

export const deleteTravel = async (req, res) => {
  const { id } = req.params;

  try {
    const travel = await db('viajes_registrados').where({ id }).first();

    if (!travel) {
      return res.status(404).json({ success: false, message: 'Travel not found' });
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