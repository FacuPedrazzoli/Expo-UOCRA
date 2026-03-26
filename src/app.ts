import express, { Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env';
import {
    requestLogger,
    errorHandler,
    securityHeaders,
    requestTimeout,
} from './utils/middleware';
import inscriptosRouter from './routes/inscriptos';
import validacionRouter from './routes/validacion';
import statsRouter from './routes/stats';

export function createApp(isServerless = false): Express {
    const app = express();
    const isProd = config.server.isProd;

    app.use(compression({ level: 6, threshold: 1024 }));
    app.use(securityHeaders);
    app.use(cors({
        origin: isServerless ? '*' : (process.env.CORS_ORIGIN || '*'),
        methods: ['GET', 'POST', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Accept'],
    }));
    app.use(express.json({ limit: '512kb' }));
    app.use(express.urlencoded({ extended: true, limit: '512kb' }));
    
    if (!isServerless) {
        app.use(requestLogger);
        app.use(requestTimeout(30_000));
    }

    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            env: config.server.nodeEnv,
            timestamp: new Date().toISOString(),
        });
    });

    app.use('/api/inscripcion', inscriptosRouter);
    app.use('/api/validacion', validacionRouter);
    app.use('/api/stats', statsRouter);

    app.use(errorHandler);

    return app;
}