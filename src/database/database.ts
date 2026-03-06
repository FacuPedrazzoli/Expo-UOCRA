import mysql from "mysql2/promise";
import logger, { logDB, logError } from "../utils/logger";

// Railway provee DATABASE_URL (mysql://user:pass@host:port/db)
// Si existe, usarla. Si no, usar variables individuales (desarrollo local).
function createPoolConfig(): mysql.PoolOptions {
    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        return {
            host: url.hostname,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1),
            port: parseInt(url.port || "3306", 10),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    }

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
logger.info(`Intentando conectar a la base de datos: ${poolConfig.database}`);

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