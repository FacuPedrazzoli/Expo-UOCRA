import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';
import logger from '../utils/logger';

declare global {
    var _pgPool: Pool | undefined;
}

const isProd = config.server.isProd;

const poolConfig = {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    max: isProd ? 1 : 10,
    idleTimeoutMillis: isProd ? 1000 : 10000,
    connectionTimeoutMillis: isProd ? 2000 : 5000,
    allowExitOnIdle: !isProd,
    ssl: isProd ? { rejectUnauthorized: false } : false,
    ...(isProd ? { statement_timeout: 8000 } : {}),
};

let pool: Pool;

if (isProd) {
    if (global._pgPool) {
        pool = global._pgPool;
        logger.debug('[DB] Reutilizando pool existente en producción');
    } else {
        pool = new Pool(poolConfig);
        global._pgPool = pool;
        logger.info('[DB] Pool creado y guardado en global para producción');
    }
} else {
    pool = new Pool(poolConfig);
}

let isReconnecting = false;

async function handleReconnect(): Promise<void> {
    if (isReconnecting) return;
    isReconnecting = true;
    logger.warn('[DB] Reconectando pool de PostgreSQL...');
    try {
        await pool.end();
        const newPool = new Pool(poolConfig);
        if (isProd) {
            global._pgPool = newPool;
        }
        Object.assign(pool, newPool);
        logger.info('[DB] Pool recreado exitosamente');
    } catch (err) {
        logger.error('[DB] Error al recrear pool:', err);
    } finally {
        isReconnecting = false;
    }
}

pool.on('error', async (err: any) => {
    logger.error('[DB] Error inesperado en el pool', err);
    if (isProd && (err.message?.includes('connection') || err.code === 'ECONNRESET')) {
        await handleReconnect();
    }
});

pool.on('connect', () => {
    logger.debug('[DB] Nueva conexión establecida');
});

async function testConnection(): Promise<void> {
    let retries = 5;
    const retryDelay = 3000;
    
    logger.info(`Intentando conectar a PostgreSQL: ${config.db.host}:${config.db.port}/${config.db.name}`);
    
    while (retries > 0) {
        try {
            const client = await pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger.debug(`[DB] Conexión establecida: ${config.db.name}@${config.db.host}:${config.db.port}`);
            return;
        } catch (err: any) {
            retries--;
            logger.error(`Error de conexión PostgreSQL (intentos restantes: ${retries}): ${err.message}`);
            if (retries === 0) {
                logger.error('[DB] No se pudo conectar después de 5 intentos. El servidor continuará.');
                return;
            }
            await new Promise(r => setTimeout(r, retryDelay));
        }
    }
}

if (!isProd) {
    testConnection().catch(() => undefined);
}

export default pool;

export async function getClient(): Promise<PoolClient> {
    return await pool.connect();
}