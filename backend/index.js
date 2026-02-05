import express from 'express';
import 'dotenv/config';
import { PORT } from './src/config/config.js'; // Quite JWT_SECRET (no se usa aqui)
import db from './src/db/db.connection.js'; // Asumo que esto conecta la DB
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import logger from './src/utils/pino/logger.js';
import userRouter from './src/routes/users/user.router.js';
import authRouter from './src/routes/login/auth.router.js'; // Sugerencia: separar auth
import driverRouter from './src/routes/drivers/driver.router.js'; // Asegúrate de importar driverRouter
import chassisRouter from './src/routes/chassis/chassis.router.js';
import coupledRouter from './src/routes/coupled/coupled.router.js';
import travelRouter from './src/routes/travel/travel.router.js';
import { iniciarCronJobs } from './src/services/expirationCron.js';
import assignmentRouter from './src/routes/assignment/assignment.router.js';
import companyRouter from './src/routes/company/company.router.js';
const app = express();

// 1. Configuración de CORS para Cookies (IMPORTANTE)
// Necesitas definir quién tiene permiso para enviar credenciales (cookies)
const whitelist = ['http://localhost:5173', 'http://localhost:3000']; // Pon aquí la URL de tu Frontend

app.use(cors({
  origin: whitelist, // No puedes usar '*' si usas credentials: true
  credentials: true, // <--- ESTO permite que viajen las Cookies (Refresh Token)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser()); 

app.use(express.json());

// 2. Cookie Parser (Perfecto, ya lo tenías)
// Esto permite que req.cookies.refreshToken funcione en tus controladores


app.use(morgan('dev'));

iniciarCronJobs(); // Iniciamos los Cron Jobs al arrancar el servidor

// Rutas
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter); // Sería ideal para login/refresh/logout
app.use('/api/drivers', driverRouter); // Asegúrate de importar driverRouter
app.use('/api/chassis', chassisRouter); 
app.use('/api/coupled', coupledRouter);
app.use('/api/travels', travelRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/company', companyRouter); // Ruta para empresas

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores generales
app.use((err, req, res, next) => {
  logger.error({ error: err.stack }, 'Error no manejado en middleware');
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  logger.info(`Servidor corriendo en el puerto ${PORT}`);
});