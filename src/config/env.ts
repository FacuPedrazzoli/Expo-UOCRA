import dotenv from 'dotenv';
import path from 'path';

// Cargar .env solo en desarrollo (en producción Railway inyecta las vars)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// Detectar configuración de BD según el entorno
// Railway provee DATABASE_URL, MYSQL_URL, o variables MYSQL* individuales
function resolveDbConfig() {
    // Opción 1: URL completa (Railway)
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    if (dbUrl) {
        const url = new URL(dbUrl);
        return {
            host:     url.hostname,
            user:     decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            name:     url.pathname.slice(1),
            port:     parseInt(url.port || '3306', 10),
        };
    }

    // Opción 2: Variables individuales de Railway (MYSQLHOST, etc.)
    if (process.env.MYSQLHOST) {
        return {
            host:     process.env.MYSQLHOST,
            user:     process.env.MYSQLUSER || 'root',
            password: process.env.MYSQLPASSWORD || '',
            name:     process.env.MYSQLDATABASE || 'railway',
            port:     parseInt(process.env.MYSQLPORT || '3306', 10),
        };
    }

    // Opción 3: Variables locales (DB_HOST, etc.)
    return {
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name:     process.env.DB_NAME || 'expoformacionuocra',
        port:     parseInt(process.env.DB_PORT || '3306', 10),
    };
}

export const config = {
    db: resolveDbConfig(),
    server: {
        port:    parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        isProd:  process.env.NODE_ENV === 'production',
    },
} as const;
