import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';
import logger from '../utils/logger';

declare global {
    var _pgPool: Pool | undefined;
    var _poolConfig: any | undefined;
}

const isProd = config.server.isProd;

const poolConfig = {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    max: 1,
    min: 0,
    idleTimeoutMillis: 800,
    connectionTimeoutMillis: 1500,
    allowExitOnIdle: true,
    ssl: isProd ? { rejectUnauthorized: false } : false,
    statement_timeout: 5000,
    query_timeout: 5000,
    keepAlive: true,
    keepAliveInitialDelay: 0,
};

let pool: Pool;

if (isProd) {
    if (global._pgPool && global._poolConfig === JSON.stringify(poolConfig)) {
        pool = global._pgPool;
        logger.debug('[DB] Reutilizando pool existente en producción');
    } else {
        if (global._pgPool) {
            global._pgPool.end().catch(() => {});
        }
        pool = new Pool(poolConfig);
        global._pgPool = pool;
        global._poolConfig = JSON.stringify(poolConfig);
        logger.info('[DB] Pool creado con config optimizada para serverless');
    }
} else {
    pool = new Pool(poolConfig);
}

pool.on('error', (err: any) => {
    logger.error('[DB] Pool error:', err.message);
    if (isProd && (err.message?.includes('connection') || err.code === 'ECONNRESET' || err.message?.includes('max clients'))) {
        try {
            pool.end().then(() => {
                pool = new Pool(poolConfig);
                global._pgPool = pool;
                logger.info('[DB] Pool recreado después de error de conexión');
            }).catch(() => {});
        } catch (e) {
            logger.error('[DB] Error al recrear pool:', e);
        }
    }
});

pool.on('connect', () => {
    logger.debug('[DB] Nueva conexión establecida');
});

pool.on('remove', () => {
    logger.debug('[DB] Conexión removida del pool');
});

export default pool;

export async function getClient(): Promise<PoolClient> {
    let client: PoolClient | null = null;
    let retries = 3;
    
    while (retries > 0) {
        try {
            client = await pool.connect();
            return client;
        } catch (err: any) {
            retries--;
            if (err.message?.includes('max clients') || err.message?.includes('connection')) {
                logger.warn(`[DB] Conexión agotada, reintento ${3 - retries}/3...`);
                await new Promise(r => setTimeout(r, 200));
            } else {
                throw err;
            }
        }
    }
    
    throw new Error('No se pudo obtener conexión después de 3 intentos');
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await getClient();
    try {
        const result = await client.query(text, params);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}