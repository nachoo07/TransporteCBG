import Joi from 'joi';

// Esquema para creación de viaje
const createTravelSchema = Joi.object({
  travel_date: Joi.date().iso().required().messages({
    'date.base': 'Travel date must be a valid date',
    'date.format': 'Travel date must be ISO format',
    'any.required': 'Travel date is required'
  }),
  
  driver_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Driver ID must be a number',
    'any.required': 'Driver ID is required'
  }),
  
  chassis_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Chassis ID must be a number',
    'any.required': 'Chassis ID is required'
  }),
  
  coupled_id: Joi.number().integer().positive().allow(null).optional(),
  company_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Company ID must be a number',
    'any.required': 'Company ID is required'
  }),

  // Documentation
  receipt_number: Joi.string().max(255).optional(),
  route_sheet: Joi.string().max(255).optional(),
  proforma_number: Joi.string().max(255).optional(),
  special_notes: Joi.string().max(1000).optional(),

  // Logistics
  origin: Joi.string().max(255).optional(),
  destination: Joi.string().max(255).optional(),
  km_traveled: Joi.number().min(0).optional(),
  quantity_loaded: Joi.number().min(0).optional(),
  quantity_unloaded: Joi.number().min(0).optional(),

  // Tariffs & Values
  tariff_value: Joi.number().min(0).allow(null).optional(),
  net_value: Joi.number().min(0).allow(null).optional(),
  iva_value: Joi.number().min(0).allow(null).optional(),
  fixed_price: Joi.number().min(0).allow(null).optional(),

  // Invoice
  invoice_number: Joi.string().max(255).optional(),
  invoice_date: Joi.date().iso().allow(null).optional(),

  // Liquidación (Empresa informa cuánto debe pagar)
  carta_de_porte: Joi.string().max(255).allow(null).optional(),

  // Advances
  advance_amount: Joi.number().min(0).optional(),
  advance_method: Joi.string().max(100).optional(),
  advance_responsible: Joi.string().max(255).optional(),

  // Fuel
  fuel_station: Joi.string().max(255).optional(),
  fuel_liters: Joi.number().min(0).optional(),
  fuel_amount: Joi.number().min(0).optional(),
  fuel_km: Joi.number().min(0).allow(null).optional(),
  fuel_km_end: Joi.number().min(0).allow(null).optional(),
  fuel_invoice: Joi.string().max(255).allow(null).optional(),

  // States
  liquidation_status: Joi.string().valid('FALTA', 'LIQUIDADO').optional(),
  payment_order: Joi.string().max(255).optional(),
  invoice_status: Joi.string().valid('FALTA', 'FACTURADO').optional(),
  payment_status: Joi.string().valid('DEBEN', 'PAGADO').optional()
}).min(3).messages({
  'object.min': 'You must provide at least the required fields'
});

// Esquema para actualización: al menos un campo
const updateTravelSchema = Joi.object({
  travel_date: Joi.date().iso().optional(),
  driver_id: Joi.number().integer().positive().optional(),
  chassis_id: Joi.number().integer().positive().optional(),
  coupled_id: Joi.number().integer().positive().allow(null).optional(),
  company_id: Joi.number().integer().positive().optional(),

  receipt_number: Joi.string().max(255).optional(),
  route_sheet: Joi.string().max(255).optional(),
  proforma_number: Joi.string().max(255).optional(),
  special_notes: Joi.string().max(1000).optional(),

  origin: Joi.string().max(255).optional(),
  destination: Joi.string().max(255).optional(),
  quantity_loaded: Joi.number().min(0).optional(),
  quantity_unloaded: Joi.number().min(0).optional(),

  tariff_value: Joi.number().min(0).allow(null).optional(),
  net_value: Joi.number().min(0).allow(null).optional(),
  iva_value: Joi.number().min(0).allow(null).optional(),
  fixed_price: Joi.number().min(0).allow(null).optional(),

  invoice_number: Joi.string().max(255).optional(),
  invoice_date: Joi.date().iso().allow(null).optional(),
  delete_invoice_photo: Joi.string().valid('true', 'false').optional(),
  delete_liquidation_file: Joi.string().valid('true', 'false').optional(),
  delete_fuel_invoice_photo: Joi.string().valid('true', 'false').optional(),

  carta_de_porte: Joi.string().max(255).allow(null).optional(),

  advance_amount: Joi.number().min(0).optional(),
  advance_method: Joi.string().max(100).optional(),
  advance_responsible: Joi.string().max(255).optional(),

  fuel_station: Joi.string().max(255).optional(),
  fuel_liters: Joi.number().min(0).optional(),
  fuel_amount: Joi.number().min(0).optional(),
  fuel_km: Joi.number().min(0).allow(null).optional(),
  fuel_km_end: Joi.number().min(0).allow(null).optional(),
  fuel_invoice: Joi.string().max(255).allow(null).optional(),

  liquidation_status: Joi.string().valid('FALTA', 'LIQUIDADO').optional(),
  payment_order: Joi.string().max(255).optional(),
  invoice_status: Joi.string().valid('FALTA', 'FACTURADO').optional(),
  payment_status: Joi.string().valid('DEBEN', 'PAGADO').optional(),
  general_status: Joi.string().valid('INCOMPLETO', 'COMPLETO').optional()
}).min(1).messages({
  'object.min': 'You must provide at least one field to update'
});

// Esquema para actualización masiva de docs/estados (multipart)
const bulkDocsSchema = Joi.object({
  ids: Joi.string().required().messages({
    'any.required': 'ids is required'
  }),
  invoice_number: Joi.string().max(255).optional(),
  invoice_date: Joi.date().iso().optional(),
  invoice_status: Joi.string().valid('FALTA', 'FACTURADO').optional(),
  liquidation_status: Joi.string().valid('FALTA', 'LIQUIDADO').optional(),
  carta_de_porte: Joi.string().max(255).allow(null, '').optional(),
}).messages({
  'any.required': 'Missing required fields'
});

/**
 * Middleware para validar creación de viaje
 */
export const validateCreateTravel = (req, res, next) => {
  const { error, value } = createTravelSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  req.body = value;
  next();
};

/**
 * Middleware para validar actualización de viaje
 */
export const validateUpdateTravel = (req, res, next) => {
  const { error, value } = updateTravelSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  req.body = value;
  next();
};

/**
 * Middleware para validar actualización masiva (docs/estados)
 */
export const validateBulkDocs = (req, res, next) => {
  const { error, value } = bulkDocsSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }

  req.body = value;
  next();
};
