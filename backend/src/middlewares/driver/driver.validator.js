import Joi from 'joi';

// Esquema para creación de chofer
const createDriverSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.base': 'El nombre debe ser texto.',
    'string.empty': 'El nombre no puede estar vacío.',
    'string.min': 'El nombre debe tener al menos 2 caracteres.',
    'any.required': 'El nombre es obligatorio.'
  }),
  apellido: Joi.string().min(2).max(100).required().messages({
    'string.base': 'El apellido debe ser texto.',
    'string.empty': 'El apellido no puede estar vacío.',
    'string.min': 'El apellido debe tener al menos 2 caracteres.',
    'any.required': 'El apellido es obligatorio.'
  }),
  dni: Joi.string().pattern(/^[0-9]{7,8}$/).required().messages({
    'string.pattern.base': 'El DNI debe contener sólo números y tener 7 u 8 dígitos.',
    'string.empty': 'El DNI no puede estar vacío.',
    'any.required': 'El DNI es obligatorio.'
  }),
  activo: Joi.boolean().optional(),
  fecha_de_alta: Joi.date().iso().optional().messages({ 'date.format': 'fecha_de_alta debe ser una fecha ISO válida.' }),
  fecha_de_baja: Joi.date().iso().allow(null, '').optional(),
  vencimiento_licencia: Joi.date().iso().allow(null, '').optional(),
  vencimiento_psicofisico: Joi.date().iso().allow(null, '').optional(),
  vencimiento_carga_normal: Joi.date().iso().allow(null, '').optional(),
  vencimiento_carga_peligrosa: Joi.date().iso().allow(null, '').optional(),
  notas: Joi.string().max(1000).allow(null, '').optional().messages({
    'string.max': 'Las notas no pueden exceder 1000 caracteres.'
  })
});

// Esquema para actualización: al menos un campo
const updateDriverSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).optional().messages({ 'string.min': 'El nombre debe tener al menos 2 caracteres.' }),
  apellido: Joi.string().min(2).max(100).optional().messages({ 'string.min': 'El apellido debe tener al menos 2 caracteres.' }),
  dni: Joi.string().pattern(/^[0-9]{7,8}$/).optional().messages({ 'string.pattern.base': 'El DNI debe contener sólo números y tener 7 u 8 dígitos.' }),
  activo: Joi.boolean().optional(),
  fecha_de_alta: Joi.date().iso().optional(),
  fecha_de_baja: Joi.date().iso().allow(null, '').optional(),
  vencimiento_licencia: Joi.date().iso().allow(null, '').optional(),
  vencimiento_psicofisico: Joi.date().iso().allow(null, '').optional(),
  vencimiento_carga_normal: Joi.date().iso().allow(null, '').optional(),
  vencimiento_carga_peligrosa: Joi.date().iso().allow(null, '').optional(),
  notas: Joi.string().max(1000).allow(null, '').optional(),
  // Flags para eliminar archivos (vienen como 'true'/'false')
  eliminar_dni: Joi.string().valid('true','false').optional(),
  eliminar_licencia: Joi.string().valid('true','false').optional(),
  eliminar_psicofisico: Joi.string().valid('true','false').optional(),
  eliminar_carga_normal: Joi.string().valid('true','false').optional(),
  eliminar_carga_peligrosa: Joi.string().valid('true','false').optional()
}).min(1).messages({ 'object.min': 'Debes proporcionar al menos un campo para actualizar.' });

// Middleware genérico
export const validate = (schema) => (req, res, next) => {
  const data = { ...req.body };

  // Normalizar campos que vienen como strings desde multipart/form-data
  // Convierte 'activo' en booleano si viene como '1'|'0'|'true'|'false'
  if (data && typeof data.activo === 'string') {
    const v = data.activo.toLowerCase();
    if (v === '1' || v === 'true') data.activo = true;
    else if (v === '0' || v === 'false') data.activo = false;
  }

  const { error } = schema.validate(data, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({ success: false, message: 'Error de validación', errors });
  }

  next();
};

export const validateCreateDriver = validate(createDriverSchema);
export const validateUpdateDriver = validate(updateDriverSchema);
