// src/utils/logger.js
import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Definimos si estamos en desarrollo
const isDevelopment = process.env.NODE_ENV !== 'production';

// Array de destinos (a dónde van los logs)
const targets = [];

// 1. CONFIGURACIÓN PARA DESARROLLO (Tu PC)
// Solo queremos ver colores en la terminal. No guardamos archivos.
if (isDevelopment) {
  targets.push({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  });
}

// 2. CONFIGURACIÓN PARA PRODUCCIÓN (Servidor / VPS)
// Aquí SÍ guardamos archivos para auditoría.
else {
  // Aseguramos que la carpeta logs exista solo si estamos en producción
  const logDir = 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  targets.push({
    target: 'pino-roll',
    options: {
      file: path.join(logDir, 'app-log'),
      frequency: 'daily',
      mkdir: true,
      extension: '.log',
      limit: {
        count: 14, // Guardar solo 2 semanas de historia
      }
    },
  });

  // Opcional: También imprimir JSON crudo en consola por si usas PM2 o Docker logs
  targets.push({
    target: 'pino/file', // Salida estándar básica
    options: { destination: 1 } // 1 = stdout (consola)
  });
}

// Creamos el transporte final
const transport = pino.transport({
  targets: targets,
});

const logger = pino(
  {
    level: isDevelopment ? 'debug' : 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;