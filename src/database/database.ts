import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import logger, { logDB, logError } from "../utils/logger";

// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Crear un pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "", 
    database: process.env.DB_NAME || "inscripciones",
    port: parseInt(process.env.DB_PORT || "3306", 10), 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Verificar la conexión al iniciar la aplicación
logger.info("Intentando conectar a la base de datos:", {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "inscripciones",
  port: parseInt(process.env.DB_PORT || "3306", 10)
});

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