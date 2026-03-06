import { Router, Response } from 'express';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/database';
import logger, { logDB, logError } from '../utils/logger';
import { inscripcionRateLimit } from '../utils/middleware';
import { sanitizeAndValidateInscripcion } from '../utils/sanitize';

const router = Router();

// ── Caché en memoria con invalidación por prefijo ────────────────────────
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class SimpleCache {
    private store = new Map<string, CacheEntry<any>>();

    set<T>(key: string, data: T, ttlMs: number): void {
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    invalidate(prefix?: string): void {
        if (!prefix) {
            this.store.clear();
            return;
        }
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }
}

const cache = new SimpleCache();

// ── POST /api/inscripcion — Registrar inscripción (multi-charla) ─────────
router.post('/', inscripcionRateLimit, async (req, res) => {
    let conn: PoolConnection | undefined;
    const t0 = Date.now();

    try {
        // 1. Sanitizar y validar inputs
        const input = sanitizeAndValidateInscripcion(req.body);
        const id = uuidv4();

        logger.info(`Iniciando inscripción: ${input.nombre} ${input.apellido} (${input.dni})`);

        // 2. Obtener conexión y comenzar transacción
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 3. Resolver como_te_enteraste
        const comoTeEnterasteId = await resolveComoTeEnteraste(conn, input.como_te_enteraste);

        // 4. Verificar duplicados (una sola query)
        await assertNoDuplicateUser(conn, input.email, input.dni);

        // 5. Insertar inscripto
        await conn.execute(
            'INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk) VALUES (?, ?, ?, ?, ?, ?)',
            [id, input.nombre, input.apellido, input.dni, input.email, comoTeEnterasteId]
        );
        logDB(`Inscripto insertado: ${id}`);

        // 6. Procesar charlas (soporta múltiples)
        const charlasInscritas: string[] = [];
        for (const charlaInput of input.charlas) {
            const charlaId = await resolveCharla(conn, charlaInput);
            charlasInscritas.push(charlaId);
        }

        // 7. Batch insert en inscriptos_charlas
        if (charlasInscritas.length > 0) {
            const valores = charlasInscritas.map(cid => [id, cid]);
            await conn.query(
                'INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) VALUES ?',
                [valores]
            );
            logDB(`Charlas asignadas: [${charlasInscritas.join(', ')}] → inscripto ${id}`);
        }

        await conn.commit();

        // Invalidar caché de charlas porque los participantes cambiaron
        cache.invalidate('charlas');

        const ms = Date.now() - t0;
        logger.info(`Inscripción completada en ${ms}ms: ${id}`);

        res.status(201).json({
            mensaje: 'Inscripción guardada correctamente',
            id,
            charlasInscritas,
            // Compatibilidad con frontend legacy
            idCharla: charlasInscritas[0] || null,
        });

    } catch (err: any) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
        }

        const ms = Date.now() - t0;
        logger.warn(`Inscripción fallida en ${ms}ms: ${err.message}`);

        if (!res.headersSent) {
            res.status(determineStatusCode(err.message)).json({
                error: categorizeError(err.message),
                mensaje: err.message,
            });
        }
    } finally {
        conn?.release();
    }
});

// ── GET /api/inscripcion/charlas — Listado con participantes ─────────────
router.get('/charlas', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');

        const cached = cache.get<any[]>('charlas_list');
        if (cached) {
            logger.debug('Charlas servidas desde caché en memoria');
            return res.json(cached);
        }

        logger.info('Solicitud de listado de charlas (BD)');
        const [charlas] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.id,
                c.titulo, 
                c.horario,
                c.empresa,
                c.ubicacion,
                COALESCE(ic.total_inscriptos, 0) AS participantes
            FROM charlas c
            LEFT JOIN (
                SELECT charlas_id, COUNT(*) AS total_inscriptos
                FROM inscriptos_charlas
                GROUP BY charlas_id
            ) ic ON c.id = ic.charlas_id
            ORDER BY c.horario ASC, c.titulo ASC
        `);
            
        logDB(`Se encontraron ${charlas.length} charlas en la base de datos`);

        const charlasFormateadas = charlas.map(charla => ({
            id: charla.id,
            horario: formatHorario(charla.horario),
            titulo: charla.titulo || 'Charla sin título',
            empresa: charla.empresa || 'UOCRA Formación',
            ubicacion: charla.ubicacion || 'Aula Principal',
            capacidad_maxima: 50,
            participantes: charla.participantes || 0,
            cupo_disponible: Math.max(0, 50 - (charla.participantes || 0)),
            disponible: (charla.participantes || 0) < 50,
        }));

        // Caché de 2 minutos — balance entre frescura y carga en BD
        cache.set('charlas_list', charlasFormateadas, 2 * 60 * 1000);

        res.json(charlasFormateadas);
        logger.debug(`Enviadas ${charlasFormateadas.length} charlas al cliente`);
    } catch (error: any) {
        logError('Error al obtener charlas', error);
        res.status(500).json({ error: 'Error al obtener charlas', mensaje: error.message });
    }
});

// ── GET /api/inscripcion/como-te-enteraste ────────────────────────────────
router.get('/como-te-enteraste', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');

        const cached = cache.get<any[]>('como_te_enteraste');
        if (cached) {
            logger.debug('Opciones como-te-enteraste servidas desde caché');
            return res.json(cached);
        }

        const [opciones] = await pool.query<RowDataPacket[]>(
            'SELECT id, descripcion FROM como_te_enteraste ORDER BY descripcion'
        );

        cache.set('como_te_enteraste', opciones, 10 * 60 * 1000); // 10 min
        logger.debug(`Enviando ${opciones.length} opciones de 'cómo te enteraste'`);
        res.json(opciones);
    } catch (error: any) {
        logError("Error al obtener opciones de 'cómo te enteraste'", error);
        res.status(500).json({ error: 'Error al obtener las opciones', mensaje: error.message });
    }
});

// ── POST /api/inscripcion/cache/clear — Invalidar caché (admin) ──────────
router.post('/cache/clear', (_req, res) => {
    cache.invalidate();
    logger.info('Caché invalidado manualmente');
    res.json({ mensaje: 'Caché limpiado correctamente' });
});

// ── POST /api/inscripcion/logs — Recibir logs del cliente ────────────────
router.post('/logs', (req, res) => {
    try {
        const { level, message } = req.body;
        if (!level || !message) {
            return res.status(400).json({ error: 'Faltan datos requeridos (level, message)' });
        }

        const safeMessage = String(message).substring(0, 500);
        
        switch (level.toLowerCase()) {
            case 'error': logger.error(`[Cliente] ${safeMessage}`); break;
            case 'warn':  logger.warn(`[Cliente] ${safeMessage}`);  break;
            case 'info':  logger.info(`[Cliente] ${safeMessage}`);  break;
            default:      logger.debug(`[Cliente] ${safeMessage}`);
        }
        
        res.status(202).end();
    } catch (error) {
        logger.error('Error al procesar log del cliente');
        res.status(500).end();
    }
});

// ── Helpers ──────────────────────────────────────────────────────────────

function formatHorario(raw: any): string {
    if (!raw) return 'Sin horario';
    if (raw instanceof Date) {
        return raw.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    if (typeof raw === 'string' && raw.includes(':')) {
        return raw.slice(0, 5); // 'HH:MM'
    }
    return String(raw);
}

async function resolveComoTeEnteraste(conn: PoolConnection, value: string): Promise<string> {
    // Buscar por ID exacto primero
    const [byId] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM como_te_enteraste WHERE id = ?', [value]
    );
    if (byId.length) return byId[0].id;

    // Fallback: buscar por descripción parcial
    const [byDesc] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM como_te_enteraste WHERE descripcion LIKE ?', [`%${value}%`]
    );
    if (byDesc.length) return byDesc[0].id;

    // Último fallback: primer registro disponible
    const [first] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM como_te_enteraste LIMIT 1'
    );
    if (first.length) {
        logger.warn(`como_te_enteraste '${value}' no encontrado, usando default: ${first[0].id}`);
        return first[0].id;
    }

    throw new Error('No hay opciones válidas en la tabla como_te_enteraste');
}

async function assertNoDuplicateUser(conn: PoolConnection, email: string, dni: string): Promise<void> {
    const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT dni, email FROM inscriptos WHERE dni = ? OR email = ? LIMIT 1',
        [dni, email]
    );
    if (!rows.length) return;

    const found = rows[0];
    if (found.dni === dni)     throw new Error('Ya existe un usuario registrado con este DNI');
    if (found.email === email) throw new Error('Ya existe un usuario registrado con este email');
}

async function resolveCharla(conn: PoolConnection, charlaInput: string): Promise<string> {
    if (charlaInput === 'no-charla') return 'N/A';

    // Buscar charla por ID
    const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, titulo FROM charlas WHERE id = ?',
        [charlaInput]
    );

    if (rows.length) return rows[0].id;

    // Fallback: buscar por título
    const [byTitle] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM charlas WHERE titulo LIKE ?',
        [`%${charlaInput}%`]
    );
    if (byTitle.length) {
        logger.warn(`Charla resuelta por título: ${byTitle[0].id}`);
        return byTitle[0].id;
    }

    throw new Error(`La charla seleccionada no existe (ID: ${charlaInput})`);
}

function determineStatusCode(message: string): number {
    if (message.includes('obligatorio') || message.includes('válido') || message.includes('válida'))
        return 400;
    if (message.includes('ya existe') || message.includes('Ya existe') || message.includes('capacidad máxima'))
        return 409;
    if (message.includes('no existe'))
        return 400;
    return 500;
}

function categorizeError(message: string): string {
    if (message.includes('DNI'))       return 'DNI ya registrado';
    if (message.includes('email'))     return 'Email ya registrado';
    if (message.includes('capacidad')) return 'Charla sin cupos disponibles';
    if (message.includes('obligatorio') || message.includes('válido')) return 'Datos inválidos';
    return 'Error al procesar la solicitud';
}

export default router;