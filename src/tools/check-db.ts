import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada en las variables de entorno.');
  process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function analyzeDatabase() {
    try {
        console.log('🔌 Conectando a la base de datos...\n');
        
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('📋 TABLAS ACTUALES:');
        tables.rows.forEach(t => console.log('   - ' + t.table_name));
        console.log('');
        
        for (const t of tables.rows) {
            const count = await pool.query(`SELECT COUNT(*) as c FROM ${t.table_name}`);
            console.log(`   ${t.table_name}: ${count.rows[0].c} registros`);
        }
        
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

analyzeDatabase();
