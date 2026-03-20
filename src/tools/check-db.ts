import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://postgres:26610569Facu@db.pkjruovvbqkziulnxqxr.supabase.co:5432/postgres',
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
