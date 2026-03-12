import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

function resolveDbConfig() {
    const dbUrl = process.env.DATABASE_URL;
    console.log('[ENV] DATABASE_URL:', dbUrl ? '**** (configured)' : 'NOT SET');
    
    if (dbUrl) {
        try {
            const url = new URL(dbUrl);
            console.log('[ENV] DB Host parsed:', url.hostname);
            return {
                host: url.hostname,
                user: decodeURIComponent(url.username),
                password: decodeURIComponent(url.password),
                name: url.pathname.slice(1),
                port: parseInt(url.port || '5432', 10),
            };
        } catch (e) {
            console.error('[ENV] Error parsing DATABASE_URL:', e);
        }
    }

    if (process.env.PGHOST) {
        return {
            host: process.env.PGHOST,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            name: process.env.PGDATABASE || 'expo-uocra',
            port: parseInt(process.env.PGPORT || '5432', 10),
        };
    }

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
