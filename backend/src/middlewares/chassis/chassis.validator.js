import Joi from 'joi';
import validateDriverFiles from '../driver/file.validator.js';

// Esquema básico para creación de chasis
const createSchema = Joi.object({
  Dominio_chasis: Joi.string().trim().min(3).max(30).required()
    .messages({
      'string.empty': 'Dominio es requerido',
      'any.required': 'Dominio es requerido',
      'string.min': 'El dominio debe tener al menos 3 caracteres',
      'string.max': 'El dominio no puede exceder 30 caracteres'
    }),
  activo: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('0','1','true','false')).default('1'),
  vencimiento_cedula_chasis: Joi.string().allow('', null).optional(),
  vencimiento_vtv_chasis: Joi.string().allow('', null).optional(),
  vencimiento_senasa_chasis: Joi.string().allow('', null).optional(),
  vencimiento_homologacion_chasis: Joi.string().allow('', null).optional(),
  vencimiento_tipificacion_carga_chasis: Joi.string().allow('', null).optional(),
});

// Esquema para actualización: todo opcional pero validado
const updateSchema = Joi.object({
  Dominio_chasis: Joi.string().trim().min(3).max(30).optional().messages({
    'string.min': 'El dominio debe tener al menos 3 caracteres',
    'string.max': 'El dominio no puede exceder 30 caracteres',
    'string.empty': 'Dominio es requerido'
  }),
  activo: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('0','1','true','false')).optional(),
  vencimiento_cedula_chasis: Joi.string().allow('', null).optional(),
  vencimiento_vtv_chasis: Joi.string().allow('', null).optional(),
  vencimiento_senasa_chasis: Joi.string().allow('', null).optional(),
  vencimiento_homologacion_chasis: Joi.string().allow('', null).optional(),
  vencimiento_tipificacion_carga_chasis: Joi.string().allow('', null).optional(),
}).options({ abortEarly: false, allowUnknown: true });

export const validateChassisFiles = (opts = {}) => validateDriverFiles(opts);

export const validateCreateChassis = (req, res, next) => {
  const body = req.body || {};
  const { error, value } = createSchema.validate(body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({ success: false, message: 'Errores de validación', errors });
  }

  // Normalizar `activo` a booleano
  if (value.activo === '0' || value.activo === 'false' || value.activo === 0) value.activo = false;
  if (value.activo === '1' || value.activo === 'true' || value.activo === 1) value.activo = true;

  req.body = { ...req.body, ...value };
  next();
};

export const validateUpdateChassis = (req, res, next) => {
  const body = req.body || {};
  const { error, value } = updateSchema.validate(body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({ success: false, message: 'Errores de validación', errors });
  }

  // Normalizar `activo` si viene
  if (value.activo !== undefined) {
    if (value.activo === '0' || value.activo === 'false' || value.activo === 0) value.activo = false;
    if (value.activo === '1' || value.activo === 'true' || value.activo === 1) value.activo = true;
  }

  req.body = { ...req.body, ...value };
  next();
};

export default { validateChassisFiles, validateCreateChassis, validateUpdateChassis };
