import Joi from 'joi';
import path from 'path';

// ==========================================
// 1. ESQUEMAS DE VALIDACIÓN (JOI)
// ==========================================

const createCompanySchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.base': 'El nombre debe ser texto.',
    'string.empty': 'El nombre no puede estar vacío.',
    'string.min': 'El nombre debe tener al menos 2 caracteres.',
    'any.required': 'El nombre es obligatorio.'
  }),
  // Validamos que sea uno de los valores permitidos en tu base de datos
  tipo_cobro: Joi.string().valid('TARIFA', 'FIJO').optional().messages({
    'any.only': 'El tipo de cobro debe ser "TARIFA" o "FIJO".'
  }),
  activo: Joi.boolean().optional()
});

const updateCompanySchema = Joi.object({
  nombre: Joi.string().min(2).max(100).optional(),
  tipo_cobro: Joi.string().valid('TARIFA', 'FIJO').optional(),
  activo: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'Debes proporcionar al menos un campo para actualizar.'
});

// ==========================================
// 2. MIDDLEWARE DE DATOS (GENÉRICO)
// ==========================================

const validate = (schema) => (req, res, next) => {
  const data = { ...req.body };

  // Normalizar booleano si viene como string (común en form-data)
  if (data.activo !== undefined && typeof data.activo === 'string') {
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

export const validateCreateCompany = validate(createCompanySchema);
export const validateUpdateCompany = validate(updateCompanySchema);

