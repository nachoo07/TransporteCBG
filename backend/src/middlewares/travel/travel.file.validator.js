import path from 'path';

/**
 * Validar archivos subidos para viajes
 */
export const validateTravelFiles = (options = {}) => {
  const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB por archivo
  const maxTotalSize = 20 * 1024 * 1024; // 20MB total máximo por request
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

  return (req, res, next) => {
    const files = req.files || {};
    const errors = [];
    let totalRequestSize = 0;

    Object.keys(files).forEach(key => {
      const fileArr = files[key];
      if (!Array.isArray(fileArr)) return;

      fileArr.forEach(file => {
        // 1. Control de Tamaño Total
        totalRequestSize += (file.size || 0);

        // 2. Control de MIME Type
        if (!allowedTypes.includes(file.mimetype)) {
          errors.push(`Field "${key}": Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }

        // 3. Control de Extensión
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          errors.push(`Field "${key}": Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
        }

        // 4. Tamaño individual
        if (file.size > maxSize) {
          errors.push(`Field "${key}": File size exceeds ${maxSize / 1024 / 1024}MB limit`);
        }
      });
    });

    // 5. Tamaño total del request
    if (totalRequestSize > maxTotalSize) {
      errors.push(`Total request size exceeds ${maxTotalSize / 1024 / 1024}MB limit`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File validation error',
        errors
      });
    }

    next();
  };
};
