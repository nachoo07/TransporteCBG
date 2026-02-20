import 'dotenv/config';
import { PORT } from './src/config/config.js'; // Quite JWT_SECRET (no se usa aqui)
import logger from './src/utils/pino/logger.js';
import { iniciarCronJobs } from './src/services/expirationCron.js';
import { createApp } from './src/app.js';
const app = createApp();

iniciarCronJobs(); // Iniciamos los Cron Jobs al arrancar el servidor

app.listen(PORT, () => {
  logger.info(`Servidor corriendo en el puerto ${PORT}`);
});
