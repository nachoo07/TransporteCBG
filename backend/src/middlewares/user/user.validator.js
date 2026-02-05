import Joi from 'joi';

const passwordComplexity = Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .required()
    .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres.',
        'string.pattern.base': 'La contraseña debe tener al menos una mayúscula, una minúscula y un número.',
        'any.required': 'La contraseña es obligatoria.'
    });
    
// Esquema para la creación de un usuario. Todos los campos son requeridos.
const createUserSchema = Joi.object({
    nombre: Joi.string().min(2).max(50).required().messages({
        'string.base': 'El nombre debe ser texto.',
        'string.empty': 'El nombre no puede estar vacío.',
        'string.min': 'El nombre debe tener al menos 2 caracteres.',
        'any.required': 'El nombre es obligatorio.'
    }),
    apellido: Joi.string().min(2).max(50).required().messages({
        'string.base': 'El apellido debe ser texto.',
        'string.empty': 'El apellido no puede estar vacío.',
        'string.min': 'El apellido debe tener al menos 2 caracteres.',
        'any.required': 'El apellido es obligatorio.'
    }),
    email: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required().messages({
        'string.min': 'El usuario debe tener al menos 3 caracteres.',
        'string.max': 'El usuario no puede tener más de 50 caracteres.',
        'string.pattern.base': 'El usuario solo puede contener letras, números y guión bajo.',
        'any.required': 'El usuario es obligatorio.'
    }),
    password: passwordComplexity
});

// Esquema para la actualización. Todos los campos son opcionales.
const updateUserSchema = Joi.object({
    nombre: Joi.string().min(2).max(50).optional(),
    apellido: Joi.string().min(2).max(50).optional(),
    email: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).optional(),
    activo: Joi.boolean().optional()
}).min(1).messages({ // Exigimos que al menos un campo venga en la petición
    'object.min': 'Debes proporcionar al menos un campo para actualizar.'
});

// Middleware genérico para validar
export const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
    if (error) {
        // Mapeamos los errores para una respuesta más clara
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({ success: false, message: 'Error de validación', errors });
    }
    next();
};

export const validateCreateUser = validate(createUserSchema);
export const validateUpdateUser = validate(updateUserSchema);