import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import logger from './utils/pino/logger.js';
import userRouter from './routes/users/user.router.js';
import authRouter from './routes/login/auth.router.js';
import driverRouter from './routes/drivers/driver.router.js';
import chassisRouter from './routes/chassis/chassis.router.js';
import coupledRouter from './routes/coupled/coupled.router.js';
import travelRouter from './routes/travel/travel.router.js';
import companyRouter from './routes/company/company.router.js';
import driverPaymentsRouter from './routes/driverPayments/driverPayments.router.js';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  // Running behind Nginx/reverse proxy in production: trust X-Forwarded-* headers.
  app.set('trust proxy', 1);

  const localDevOrigins = [
    'http://localhost:5177',
    'http://localhost:3000',
  ];

  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const whitelist = [...new Set([...localDevOrigins, ...envOrigins])];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (whitelist.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(cookieParser());
  app.use(express.json());

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      logger.info(
        { method: req.method, url: req.originalUrl ?? req.url, status: res.statusCode, ms },
        'HTTP',
      );
    });
    next();
  });

  app.use('/api/users', userRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/drivers', driverRouter);
  app.use('/api/chassis', chassisRouter);
  app.use('/api/coupled', coupledRouter);
  app.use('/api/travels', travelRouter);
  app.use('/api/company', companyRouter);
  app.use('/api/driver-payments', driverPaymentsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  app.use((err, req, res, next) => {
    logger.error({ error: err.stack }, 'Error no manejado en middleware');
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
};

export default createApp;
