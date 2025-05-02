import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import inscriptosRouter from './routes/inscriptos';
import logger from './utils/logger';
import { requestLogger, errorHandler, unknownEndpoint } from './utils/middleware';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default function startServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    // Configurar middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Middleware de logging para todas las peticiones
    app.use(requestLogger);

    // Configurar rutas para archivos estáticos
    app.use(express.static(path.join(__dirname, '../public'), {
        etag: false,
        lastModified: false
    }));

    // Rutas API
    app.use('/api/inscripcion', inscriptosRouter);

    // Ruta para la página principal
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });

    // También asegura que la carpeta html sea accesible
    app.use('/html', express.static(path.join(__dirname, '../public/html'), {
        etag: false,
        lastModified: false
    }));

    // Fallback para Single Page Application (SPA)
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../public/html/index.html'));
    });

    // Middleware para manejar endpoints desconocidos debe ir después de todas las rutas
    app.use(unknownEndpoint);
    
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