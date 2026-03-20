import { Pool } from 'pg';

const pool = new Pool({
    connectionString: 'postgresql://postgres:26610569Facu@db.pkjruovvbqkziulnxqxr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
});

async function fixDatabase() {
    try {
        console.log('🔌 Conectando a la base de datos...\n');
        
        // Recrear inscriptos_ingresos (necesaria para validación)
        console.log('📦 Creando tabla inscriptos_ingresos...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inscriptos_ingresos (
                inscriptos_id VARCHAR(36) NOT NULL,
                fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (inscriptos_id),
                CONSTRAINT fk_inscriptos_ingreso FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE
            );
        `);
        console.log('   ✅ CREADA: inscriptos_ingresos');
        
        // Eliminar tabla usuarios (no necesaria según el usuario)
        console.log('🗑️  Eliminando tabla usuarios...');
        await pool.query('DROP TABLE IF EXISTS usuarios CASCADE');
        console.log('   ✅ ELIMINADA: usuarios');
        
        // Ver estado final
        console.log('\n📋 TABLAS FINALES:');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        tables.rows.forEach(t => console.log('   - ' + t.table_name));
        
        console.log('\n✅ Base de datos corregida correctamente!');
        
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixDatabase();
