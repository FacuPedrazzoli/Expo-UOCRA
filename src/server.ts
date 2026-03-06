import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import inscriptosRouter from './routes/inscriptos';
import validacionRouter from './routes/validacion';
import logger, { logError } from './utils/logger';
import { config } from './config/env';
import {
    requestLogger,
    errorHandler,
    unknownEndpoint,
    securityHeaders,
    requestTimeout,
} from './utils/middleware';

export default function startServer() {
    const app = express();
    const port = config.server.port;
    const isProd = config.server.isProd;

    // ── Middlewares globales ────────────────────────────────────────────
    app.use(compression({ level: 6, threshold: 1024 }));
    app.use(securityHeaders);
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PATCH'],
        allowedHeaders: ['Content-Type'],
    }));
    app.use(express.json({ limit: '512kb' }));
    app.use(express.urlencoded({ extended: true, limit: '512kb' }));
    app.use(requestLogger);
    app.use(requestTimeout(30_000));

    // ── Archivos estáticos con caché granular por tipo ──────────────────
    // CSS/JS: 7 días en producción
    app.use('/css', express.static(path.join(__dirname, '../public/css'), {
        etag: true, lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));
    app.use('/js', express.static(path.join(__dirname, '../public/js'), {
        etag: true, lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));
    // Imágenes: 7 días
    app.use('/img', express.static(path.join(__dirname, '../public/img'), {
        etag: true, lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));
    // Fallback estático
    app.use(express.static(path.join(__dirname, '../public'), {
        etag: true, lastModified: true,
        maxAge: isProd ? '1d' : 0,
    }));

    // ── Health check para Railway ──────────────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            env: config.server.nodeEnv,
            uptime: Math.round(process.uptime()),
        });
    });

    // ── Rutas API ──────────────────────────────────────────────────────
    app.use('/api/inscripcion', inscriptosRouter);
    app.use('/api/validacion', validacionRouter);

    // ── Rutas HTML (no-cache) ──────────────────────────────────────────
    app.get('/', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });

    // Ruta oculta para validación de inscriptos
    app.get('/admin-validacion', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(__dirname, '../public/html/validacion.html'));
    });

    // Carpeta html accesible
    app.use('/html', express.static(path.join(__dirname, '../public/html'), {
        etag: true, lastModified: true,
        maxAge: isProd ? '1d' : 0,
    }));

    // ── Fallback: SPA para rutas desconocidas, 404 para API ────────────
    app.use((req, res, _next) => {
        if (req.path.startsWith('/api/')) {
            return unknownEndpoint(req, res);
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });

    // ── Error handler (debe ir al final) ───────────────────────────────
    app.use(errorHandler);

    // ── Iniciar servidor con manejo de errores de puerto ───────────────
    const server = app.listen(port, () => {
        logger.info(`Servidor iniciado en http://localhost:${port} [${config.server.nodeEnv}]`);
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            logger.warn(`Puerto ${port} en uso, probando ${port + 1}...`);
            server.close();
            app.listen(port + 1, () => {
                logger.info(`Servidor iniciado en http://localhost:${port + 1}`);
            });
        } else {
            logError('Error crítico al iniciar servidor', err);
            process.exit(1);
        }
    });

    // ── Graceful shutdown ──────────────────────────────────────────────
    const shutdown = (signal: string) => {
        logger.info(`Señal ${signal} recibida. Cerrando servidor...`);
        server.close(() => {
            logger.info('Servidor cerrado correctamente.');
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
}

// Permitir ejecutar el archivo directamente
if (require.main === module) {
    startServer();
}