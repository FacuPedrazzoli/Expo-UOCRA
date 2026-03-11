import express, { Request, Response, NextFunction } from 'express';
import inscriptosRouter from './routes/inscriptos';
import validacionRouter from './routes/validacion';
import { config } from './config/env';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        env: config.server.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});

// Rutas API
app.use('/api/inscripcion', inscriptosRouter);
app.use('/api/validacion', validacionRouter);

// Manejo de errores
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message,
    });
});

export default app;
