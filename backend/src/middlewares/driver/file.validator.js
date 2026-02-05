import path from 'path'; // 🔥 Importamos path

export const validateDriverFiles = (options = {}) => {
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB por archivo
  const maxTotalSize = 20 * 1024 * 1024; // 🔥 Nuevo: 20MB total máximo por request
  const allowedTypes = options.allowedTypes || ['image/jpeg','image/png','image/jpg','application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']; // 🔥 Extensiones permitidas

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
          errors.push(`${key}: tipo de archivo no permitido (${file.mimetype}).`);
        }
        
        // 3. Control de Tamaño Individual
        if (file.size && file.size > maxSize) {
          errors.push(`${key}: el archivo excede el tamaño máximo de ${Math.round(maxSize/1024/1024)}MB.`);
        }

        // 4. 🔥 Control de Extensión Real (Seguridad)
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            errors.push(`${key}: extensión de archivo ${ext} no permitida.`);
        }
      });
    });

    if (totalRequestSize > maxTotalSize) {
        return res.status(413).json({ 
            success: false, 
            message: `El tamaño total de los archivos excede el límite de ${Math.round(maxTotalSize/1024/1024)}MB.` 
        });
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Error de validación de archivos', errors });
    }

    next();
  };
};

export default validateDriverFiles;