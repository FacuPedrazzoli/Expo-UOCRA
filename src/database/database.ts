import mysql from "mysql2/promise";
import logger, { logDB, logError } from "../utils/logger";

// Soporta múltiples formas de configurar la BD:
// 1. DATABASE_URL o MYSQL_URL (Railway URL completa)
// 2. MYSQLHOST/MYSQLUSER/etc (Railway variables individuales)
// 3. DB_HOST/DB_USER/etc (desarrollo local)
function createPoolConfig(): mysql.PoolOptions {
    // Opción 1: URL completa (Railway la provee como DATABASE_URL o MYSQL_URL)
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    if (dbUrl) {
        logger.info("[DB Config] Usando DATABASE_URL/MYSQL_URL");
        const url = new URL(dbUrl);
        return {
            host: url.hostname,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: url.pathname.slice(1),
            port: parseInt(url.port || "3306", 10),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    }

    // Opción 2: Variables individuales de Railway (MYSQLHOST, MYSQLUSER, etc.)
    if (process.env.MYSQLHOST) {
        logger.info("[DB Config] Usando variables MYSQL* de Railway");
        return {
            host: process.env.MYSQLHOST,
            user: process.env.MYSQLUSER || "root",
            password: process.env.MYSQLPASSWORD || "",
            database: process.env.MYSQLDATABASE || "railway",
            port: parseInt(process.env.MYSQLPORT || "3306", 10),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    }

    // Opción 3: Variables locales (DB_HOST, DB_USER, etc.)
    logger.info("[DB Config] Usando variables DB_* locales");
    return {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "inscripciones",
        port: parseInt(process.env.DB_PORT || "3306", 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    };
}

const poolConfig = createPoolConfig();
const pool = mysql.createPool(poolConfig);

// Verificar la conexión al iniciar la aplicación
logger.info(`Intentando conectar a la base de datos: ${poolConfig.database} en ${poolConfig.host}:${poolConfig.port}`);

pool.getConnection()
    .then((connection) => {
        logger.info("Conexión a MySQL establecida con éxito");
        logDB("Pool de conexiones inicializado correctamente");
        connection.release();
    })
    .catch((err) => {
        logError("Error al conectar con MySQL", err);
    });

// Exportación estándar para TypeScript
export default pool;