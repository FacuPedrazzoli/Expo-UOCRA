import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import inscriptosRouter from './routes/inscriptos';
import validacionRouter from './routes/validacion';
import { config } from './config/env';

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

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
