import express from 'express';
import path from 'path';
import { createApp } from './app';
import { requestLogger, unknownEndpoint } from './utils/middleware';
import logger, { logError } from './utils/logger';
import { config } from './config/env';

const PUBLIC_PATH = path.join(__dirname, '../public');
const HTML_PATH = path.join(PUBLIC_PATH, 'html');

export default function startServer() {
    const app = createApp(false);
    const port = config.server.port;
    const isProd = config.server.isProd;

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
    
    app.use('/img', express.static(path.join(PUBLIC_PATH, 'img'), {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '7d' : 0,
        setHeaders: (res) => { if (isProd) res.setHeader('Cache-Control', 'public, max-age=604800'); }
    }));

    app.use('/html', express.static(HTML_PATH, {
        etag: true,
        lastModified: true,
        maxAge: isProd ? '1d' : 0,
    }));

    app.get('/', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'index.html'));
    });

    app.get('/admin-validacion', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'validacion.html'));
    });

    app.get('/estadisticas', (_req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'estadisticas.html'));
    });

    app.use((req, res, _next) => {
        if (req.path.startsWith('/api/')) {
            return unknownEndpoint(req, res);
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(HTML_PATH, 'index.html'));
    });

    const server = app.listen(port, () => {
        logger.info(`Servidor iniciado en http://localhost:${port} [${config.server.nodeEnv}]`);
        logger.info(`Path público: ${PUBLIC_PATH}`);
    });

    if (!isProd) {
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
    }

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
