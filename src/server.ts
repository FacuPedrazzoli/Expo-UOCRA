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

const PUBLIC_PATH = path.join(__dirname, '../public');
const HTML_PATH = path.join(PUBLIC_PATH, 'html');

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

    // ── Archivos estáticos con caché ─────────────────────────────────────
    // CSS/JS: 7 días en producción
    app.use('/css', express.static(path.join(PUBLIC_PATH, 'css'), {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));
    
    app.use('/js', express.static(path.join(PUBLIC_PATH, 'js'), {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));
    
    // Imágenes: 7 días
    app.use('/img', express.static(path.join(PUBLIC_PATH, 'img'), {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));

    // ── Health check para Railway (sin middleware de logging) ────────────
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            env: config.server.nodeEnv,
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    });

    // ── Rutas API ────────────────────────────────────────────────────────
    app.use('/api/inscripcion', inscriptosRouter);
    app.use('/api/validacion', validacionRouter);

    // ── Rutas principales del frontend ─────────────────────────────────
    app.get('/', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'index.html'));
    });

    app.get('/admin-validacion', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'validacion.html'));
    });

    // ── Carpeta html accesible ──────────────────────────────────────────
    app.use('/html', express.static(HTML_PATH, {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '1d' : 0,
    }));

    // ── Fallback: SPA para rutas del frontend, 404 para API ────────────
    app.use((req, res, _next) => {
        if (req.path.startsWith('/api/')) {
            return unknownEndpoint(req, res);
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'index.html'));
    });

    // ── Error handler (debe ir al final) ───────────────────────────────
    app.use(errorHandler);

    // ── Iniciar servidor con manejo de errores de puerto ───────────────
    const server = app.listen(port, () => {
        logger.info(`Servidor iniciado en http://localhost:${port} [${config.server.nodeEnv}]`);
        logger.info(`Path público: ${PUBLIC_PATH}`);
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

if (require.main === module) {
    startServer();
}
