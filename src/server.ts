import express from 'express';
import path from 'path';
import cors from 'cors';
import inscriptosRouter from './routes/inscriptos';
import validacionRouter from './routes/validacion';
import logger from './utils/logger';
import { requestLogger, errorHandler, unknownEndpoint, rateLimiter, securityHeaders, inputSanitizer } from './utils/middleware';

export default function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    // Seguridad: headers de protección
    app.use(securityHeaders);

    // CORS configurado desde variables de entorno
    app.use(cors({
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PATCH'],
        allowedHeaders: ['Content-Type'],
    }));

    // Parseo de body con límite de tamaño
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Sanitización de inputs
    app.use(inputSanitizer);

    // Rate limiting en endpoints de escritura
    app.use('/api/inscripcion', rateLimiter);

    // Middleware de logging para todas las peticiones
    app.use(requestLogger);

    // Configurar rutas para archivos estáticos con caché
    app.use(express.static(path.join(__dirname, '../public'), {
        etag: true,
        lastModified: true,
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
    }));

    // Rutas API
    app.use('/api/inscripcion', inscriptosRouter);
    app.use('/api/validacion', validacionRouter);

    // Ruta para la página principal
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });

    // Ruta oculta para validación de inscriptos (no aparece en menús ni navegación)
    app.get('/admin-validacion', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/html/validacion.html'));
    });

    // También asegura que la carpeta html sea accesible
    app.use('/html', express.static(path.join(__dirname, '../public/html'), {
        etag: true,
        lastModified: true,
        maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
    }));

    // Fallback: rutas no-API sirven el SPA, rutas API desconocidas retornan 404
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return unknownEndpoint(req, res);
        }
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });
    
    // Middleware para manejar errores debe ir al final
    app.use(errorHandler);

    // Iniciar el servidor
    const server = app.listen(port, () => {
        logger.info(`Servidor corriendo en http://localhost:${port}`);
    });

    return server;
}

// Permitir ejecutar el archivo directamente
if (require.main === module) {
    startServer();
}