import Joi from 'joi';

const withKmValidation = (schema) =>
  schema.custom((value, helpers) => {
    const kmInicio = value.fuel_km;
    const kmFin = value.fuel_km_end;

    if (
      kmInicio !== undefined && kmInicio !== null && kmInicio !== '' &&
      kmFin !== undefined && kmFin !== null && kmFin !== '' &&
      Number(kmFin) < Number(kmInicio)
    ) {
      return helpers.error('any.invalid', {
        message: 'El KM al llegar debe ser mayor o igual al KM al cargar combustible',
        field: 'fuel_km_end',
      });
    }

    const kmInicioVuelta = value.fuel_return_km;
    const kmFinVuelta = value.fuel_return_km_end;

    if (
      kmInicioVuelta !== undefined && kmInicioVuelta !== null && kmInicioVuelta !== '' &&
      kmFinVuelta !== undefined && kmFinVuelta !== null && kmFinVuelta !== '' &&
      Number(kmFinVuelta) < Number(kmInicioVuelta)
    ) {
      return helpers.error('any.invalid', {
        message: 'El KM al llegar de vuelta debe ser mayor o igual al KM al cargar combustible de vuelta',
        field: 'fuel_return_km_end',
      });
    }

    return value;
  }).messages({
    'any.invalid': '{{#message}}',
  });

// Esquema para creación de viaje
const createTravelSchema = withKmValidation(Joi.object({
  travel_date: Joi.date().iso().required().messages({
    'date.base': 'La fecha del viaje debe ser válida',
    'date.format': 'La fecha del viaje debe tener formato válido',
    'any.required': 'La fecha del viaje es obligatoria'
  }),
  
  driver_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Debe seleccionar un chofer',
    'any.required': 'El chofer es obligatorio'
  }),
  
  chassis_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Debe seleccionar un chasis',
    'any.required': 'El chasis es obligatorio'
  }),
  
  coupled_id: Joi.number().integer().positive().allow(null).optional(),
  company_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Debe seleccionar una empresa',
    'any.required': 'La empresa es obligatoria'
  }),

  // Documentation
  receipt_number: Joi.string().max(255).optional(),
  route_sheet: Joi.string().max(255).optional(),
  proforma_number: Joi.string().max(255).optional(),
  special_notes: Joi.string().max(1000).optional(),

  // Logistics
  origin: Joi.string().max(255).required().messages({
    'string.empty': 'El origen es obligatorio',
    'any.required': 'El origen es obligatorio'
  }),
  destination: Joi.string().max(255).required().messages({
    'string.empty': 'El destino es obligatorio',
    'any.required': 'El destino es obligatorio'
  }),
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
  fuel_return_station: Joi.string().max(255).optional(),
  fuel_return_liters: Joi.number().min(0).optional(),
  fuel_return_amount: Joi.number().min(0).optional(),
  fuel_return_km: Joi.number().min(0).allow(null).optional(),
  fuel_return_km_end: Joi.number().min(0).allow(null).optional(),
  fuel_return_invoice: Joi.string().max(255).allow(null).optional(),

  // States
  liquidation_status: Joi.string().valid('FALTA', 'LIQUIDADO').optional(),
  payment_order: Joi.string().max(255).optional(),
  invoice_status: Joi.string().valid('FALTA', 'FACTURADO').optional(),
  payment_status: Joi.string().valid('DEBEN', 'PAGADO').optional()
}).min(3).messages({
  'object.min': 'Debe completar los campos obligatorios'
}));

// Esquema para actualización: al menos un campo
const updateTravelSchema = withKmValidation(Joi.object({
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
  fuel_return_station: Joi.string().max(255).optional(),
  fuel_return_liters: Joi.number().min(0).optional(),
  fuel_return_amount: Joi.number().min(0).optional(),
  fuel_return_km: Joi.number().min(0).allow(null).optional(),
  fuel_return_km_end: Joi.number().min(0).allow(null).optional(),
  fuel_return_invoice: Joi.string().max(255).allow(null).optional(),
  delete_fuel_return_invoice_photo: Joi.string().valid('true', 'false').optional(),

  liquidation_status: Joi.string().valid('FALTA', 'LIQUIDADO').optional(),
  payment_order: Joi.string().max(255).optional(),
  invoice_status: Joi.string().valid('FALTA', 'FACTURADO').optional(),
  payment_status: Joi.string().valid('DEBEN', 'PAGADO').optional(),
  general_status: Joi.string().valid('INCOMPLETO', 'COMPLETO').optional()
}).min(1).messages({
  'object.min': 'Debe enviar al menos un campo para actualizar'
}));

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
  payment_order: Joi.string().max(255).allow(null, '').optional(),
  payment_status: Joi.string().valid('DEBEN', 'PAGADO').optional(),
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
      message: 'Errores de validación',
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
      message: 'Errores de validación',
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
