// Helper centralizado para extraer mensajes de error del backend
// Uso: import getErrorMsg from 'frontend/src/helper/helperError/ErrorMsg..jsx'
export const getErrorMsg = (error, defaultMsg = 'Ocurrió un error') => {
  const data = error?.response?.data;

  // Caso 1: Array de errores de validación (Joi)
  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.field && item?.message) return `${item.field}: ${item.message}`;
        if (item?.message) return item.message;
        return String(item);
      })
      .join('\n');
  }

  // Caso 2: Mensaje directo del backend (ej: Email duplicado)
  if (typeof data?.message === 'string') {
    return data.message;
  }

  // Caso 3: Fallback (Error de red o desconocido)
  return defaultMsg;
};

export default getErrorMsg;
