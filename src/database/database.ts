import mysql from "mysql2/promise";
import { config } from "../config/env";
import logger, { logDB, logError } from "../utils/logger";

const pool = mysql.createPool({
    host:     config.db.host,
    user:     config.db.user,
    password: config.db.password,
    database: config.db.name,
    port:     config.db.port,

    // Pool settings
    waitForConnections: true,
    connectionLimit:    20,
    queueLimit:         50,
    idleTimeout:        60000,
    enableKeepAlive:    true,
    keepAliveInitialDelay: 30000,

    // Encoding
    charset:  'utf8mb4',
    timezone: '+00:00',

    // Timeouts
    connectTimeout: 10000,

    // Seguridad: prevenir SQL injection multi-statement
    multipleStatements: false,
});

// Verificar conexión con reintentos
async function testConnection(): Promise<void> {
    let retries = 3;
    while (retries > 0) {
        try {
            const conn = await pool.getConnection();
            logDB(`Conexión al pool de MySQL establecida: ${config.db.name}@${config.db.host}:${config.db.port}`);
            conn.release();
            return;
        } catch (err: any) {
            retries--;
            logError(`Error al conectar con MySQL (intentos restantes: ${retries})`, err);
            if (retries === 0) {
                logger.error('[DB] No se pudo conectar a la base de datos después de 3 intentos');
                return;
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

testConnection();

// Exportación estándar para TypeScript
export default pool;