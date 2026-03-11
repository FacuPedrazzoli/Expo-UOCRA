import { Pool, PoolClient } from 'pg';
import { config } from '../config/env';
import logger from '../utils/logger';

const isProd = config.server.isProd;

const pool = new Pool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isProd ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
    logger.error('[DB] Error inesperado en el pool', err);
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

testConnection().catch(() => undefined);

export default pool;

export async function getClient(): Promise<PoolClient> {
    return await pool.connect();
}
