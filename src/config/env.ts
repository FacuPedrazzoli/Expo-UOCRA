import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

function resolveDbConfig() {
    // Opción 1: DATABASE_URL (Vercel/Supabase)
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const url = new URL(dbUrl);
        return {
            host: url.hostname,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            name: url.pathname.slice(1),
            port: parseInt(url.port || '5432', 10),
        };
    }

    // Opción 2: Variables individuales
    if (process.env.PGHOST) {
        return {
            host: process.env.PGHOST,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            name: process.env.PGDATABASE || 'expo-uocra',
            port: parseInt(process.env.PGPORT || '5432', 10),
        };
    }

    // Default para desarrollo local
    return {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    };
}

export const config = {
    db: resolveDbConfig(),
    server: {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        isProd: process.env.NODE_ENV === 'production',
    },
} as const;
