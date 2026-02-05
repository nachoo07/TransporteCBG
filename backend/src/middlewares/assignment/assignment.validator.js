import Joi from 'joi';

const idSchema = Joi.number().integer().positive().required()
  .messages({
    'any.required': 'El campo es obligatorio',
    'number.base': 'Debe ser numérico',
    'number.integer': 'Debe ser entero',
    'number.positive': 'Debe ser mayor a 0'
  });

const createSchema = Joi.object({
  chofer_id: idSchema.label('chofer_id'),
  chasis_id: idSchema.label('chasis_id'),
  acoplado_id: idSchema.label('acoplado_id')
}).options({ abortEarly: false, allowUnknown: false });

const finishSchema = Joi.object({
  id: idSchema.label('id')
}).options({ abortEarly: false, allowUnknown: false });

const formatErrors = (error) => error.details.map(d => `${d.context.label || d.path.join('.')}: ${d.message}`);

export const validateCreateAssignment = (req, res, next) => {
  const { error, value } = createSchema.validate(req.body || {}, { convert: true });
  if (error) return res.status(400).json({ success: false, message: 'Errores de validación', errors: formatErrors(error) });
  req.body = value;
  next();
};

export const validateFinishAssignment = (req, res, next) => {
  const { error, value } = finishSchema.validate(req.params || {}, { convert: true });
  if (error) return res.status(400).json({ success: false, message: 'Errores de validación', errors: formatErrors(error) });
  req.params = value;
  next();
};

export default { validateCreateAssignment, validateFinishAssignment };
