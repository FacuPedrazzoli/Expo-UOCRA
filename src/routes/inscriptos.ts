import { Router, Response } from 'express';
import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pool, { getClient } from '../database/database';
import logger from '../utils/logger';
import { inscripcionRateLimit } from '../utils/middleware';
import { sanitizeAndValidateInscripcion } from '../utils/sanitize';

const router = Router();

async function dbQuery(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('[DB] Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
}

router.post('/', inscripcionRateLimit, async (req, res) => {
    let client: PoolClient | undefined;
    const t0 = Date.now();

    try {
        const input = sanitizeAndValidateInscripcion(req.body);
        const id = uuidv4();

        logger.info(`Iniciando inscripción: ${input.nombre} ${input.apellido} (${input.dni})`);

        client = await getClient();
        await client.query('BEGIN');

        const comoTeEnterasteId = await resolveComoTeEnteraste(client, input.como_te_enteraste);

        await assertNoDuplicateUser(client, input.email, input.dni);

        await client.query(
            'INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, input.nombre, input.apellido, input.dni, input.email, comoTeEnterasteId]
        );
        logger.debug(`[DB] Inscripto insertado: ${id}`);

        const charlasInscritas: string[] = [];
        for (const charlaInput of input.charlas) {
            if (charlaInput === 'no-charla') continue;
            const charlaId = await resolveCharla(client, charlaInput);
            charlasInscritas.push(charlaId);
        }

        if (charlasInscritas.length > 0) {
            for (const cid of charlasInscritas) {
                await client.query(
                    'INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) VALUES ($1, $2)',
                    [id, cid]
                );
            }
            logger.debug(`[DB] Charlas asignadas: [${charlasInscritas.join(', ')}] → inscripto ${id}`);
        }

        await client.query('COMMIT');

        const ms = Date.now() - t0;
        logger.info(`Inscripción completada en ${ms}ms: ${id}`);

        res.status(201).json({
            mensaje: 'Inscripción guardada correctamente',
            id,
            charlasInscritas,
            idCharla: charlasInscritas[0] || null,
        });

    } catch (err: any) {
        if (client) {
            try { await client.query('ROLLBACK'); } catch (_) {}
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
        client?.release();
    }
});

router.get('/charlas', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');

        logger.info('Solicitud de listado de charlas (BD)');
        
        const result = await dbQuery(`
            SELECT 
                c.id,
                c.titulo, 
                c.horario,
                c.empresa,
                c.ubicacion,
                COALESCE(ic.total_inscriptos, 0) AS participantes
            FROM Chantalas c
            LEFT JOIN (
                SELECT charlas_id, COUNT(*) AS total_inscriptos
                FROM inscriptos_charlas
                GROUP BY charlas_id
            ) ic ON c.id = ic.charlas_id
            ORDER BY c.horario ASC, c.titulo ASC
        `);
            
        logger.debug(`[DB] Se encontraron ${result.rowCount} charlas en la base de datos`);

        const charlasFormateadas = result.rows.map((charla: any) => ({
            id: charla.id,
            horario: formatHorario(charla.horario),
            titulo: charla.titulo || 'Charla sin título',
            empresa: charla.empresa || 'UOCRA Formación',
            ubicacion: charla.ubicacion || 'Aula Principal',
            capacidad_maxima: 50,
            participantes: parseInt(charla.participantes) || 0,
            cupo_disponible: Math.max(0, 50 - (parseInt(charla.participantes) || 0)),
            disponible: (parseInt(charla.participantes) || 0) < 50,
        }));

        res.json(charlasFormateadas);
        logger.debug(`Enviadas ${charlasFormateadas.length} charlas al cliente`);
    } catch (error: any) {
        logger.error('Error al obtener charlas', error);
        res.status(500).json({ error: 'Error al obtener charlas', mensaje: error.message });
    }
});

router.get('/como-te-enteraste', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');

        const result = await dbQuery(
            'SELECT id, descripcion FROM como_te_enteraste ORDER BY descripcion'
        );

        logger.debug(`Enviando ${result.rows.length} opciones de 'cómo te enteraste'`);
        res.json(result.rows);
    } catch (error: any) {
        logger.error("Error al obtener opciones de 'cómo te enteraste'", error);
        res.status(500).json({ error: 'Error al obtener las opciones', mensaje: error.message });
    }
});

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
            case 'info':  logger.info(`[Cliente] ${safeMessage}`);   break;
            default:      logger.debug(`[Cliente] ${safeMessage}`);
        }
        
        res.status(202).end();
    } catch (error) {
        logger.error('Error al procesar log del cliente');
        res.status(500).end();
    }
});

function formatHorario(raw: any): string {
    if (!raw) return 'Sin horario';
    if (raw instanceof Date) {
        return raw.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }
    if (typeof raw === 'string' && raw.includes(':')) {
        return raw.slice(0, 5);
    }
    return String(raw);
}

async function resolveComoTeEnteraste(client: PoolClient, value: string): Promise<string> {
    const byIdResult = await client.query(
        'SELECT id FROM como_te_enteraste WHERE id = $1', [value]
    );
    if (byIdResult.rowCount && byIdResult.rowCount > 0) return byIdResult.rows[0].id;

    const byDescResult = await client.query(
        'SELECT id FROM como_te_enteraste WHERE descripcion ILIKE $1', [`%${value}%`]
    );
    if (byDescResult.rowCount && byDescResult.rowCount > 0) return byDescResult.rows[0].id;

    logger.error(`como_te_enteraste '${value}' no encontrado en la base de datos`);
    throw new Error(`La opción "${value}" no es válida. Por favor contactá al administrador.`);
}

async function assertNoDuplicateUser(client: PoolClient, email: string, dni: string): Promise<void> {
    const result = await client.query(
        'SELECT dni, email FROM inscriptos WHERE dni = $1 OR email = $2 LIMIT 1',
        [dni, email]
    );
    if (!result.rowCount || result.rowCount === 0) return;

    const found = result.rows[0];
    if (found.dni === dni) throw new Error('Ya existe un usuario registrado con este DNI');
    if (found.email === email) throw new Error('Ya existe un usuario registrado con este email');
}

async function resolveCharla(client: PoolClient, charlaInput: string): Promise<string> {
    if (charlaInput === 'no-charla') return 'N/A';

    const rows = await client.query(
        'SELECT id, titulo FROM charlas WHERE id = $1',
        [charlaInput]
    );

    if (rows.rowCount && rows.rowCount > 0) return rows.rows[0].id;

    const byTitle = await client.query(
        'SELECT id FROM charlas WHERE titulo ILIKE $1',
        [`%${charlaInput}%`]
    );
    if (byTitle.rowCount && byTitle.rowCount > 0) {
        logger.warn(`Charla resuelta por título: ${byTitle.rows[0].id}`);
        return byTitle.rows[0].id;
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
    if (message.includes('DNI')) return 'DNI ya registrado';
    if (message.includes('email')) return 'Email ya registrado';
    if (message.includes('capacidad')) return 'Charla sin cupos disponibles';
    if (message.includes('obligatorio') || message.includes('válido')) return 'Datos inválidos';
    return 'Error al procesar la solicitud';
}

export default router;
