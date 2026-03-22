import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está configurada en las variables de entorno.');
  process.exit(1);
}

console.log('🔌 DATABASE_URL:', DATABASE_URL.replace(/postgres:[^@]+/, 'postgres:****'));

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function insertCharlas() {
    let client;
    try {
        console.log('🔌 Conectando a la base de datos...');
        client = await pool.connect();
        
        const test = await client.query('SELECT NOW()');
        console.log('✅ Conexión exitosa:', test.rows[0].now);
        
        console.log('📝 Verificando si ya existen charlas...');
        
        const existing = await client.query('SELECT COUNT(*) as count FROM charlas');
        if (parseInt(existing.rows[0].count) > 0) {
            console.log('⚠️  Ya hay charlas en la base de datos. Mostrando existentes:');
            const charlas = await client.query('SELECT * FROM charlas ORDER BY horario');
            console.table(charlas.rows);
            console.log('\n✅ Proceso completado.');
            return;
        }
        
        console.log('📦 Insertando charlas...');
        
        const charlas = [
            { id: 'A', horario: '09:00', titulo: 'Charla Inaugural', empresa: 'UOCRA', ubicacion: 'Salón Principal' },
            { id: 'B', horario: '10:00', titulo: 'Seguridad en Construcción', empresa: 'OSHA Argentina', ubicacion: 'Aula 1' },
            { id: 'C', horario: '11:00', titulo: 'Normativas Laborales', empresa: 'Ministerio de Trabajo', ubicacion: 'Aula 2' },
            { id: 'D', horario: '12:00', titulo: 'Técnicas de Albañilería', empresa: 'Camarco', ubicacion: 'Aula 1' },
            { id: 'E', horario: '14:00', titulo: 'Electricidad Básica', empresa: 'Federación de Electricistas', ubicacion: 'Aula 2' },
            { id: 'F', horario: '15:00', titulo: 'Primeros Auxilios', empresa: 'Cruz Roja', ubicacion: 'Salón Principal' },
            { id: 'G', horario: '16:00', titulo: 'Uso de Equipos de Protección', empresa: 'UOCRA', ubicacion: 'Aula 1' },
        ];
        
        for (const charla of charlas) {
            await client.query(
                'INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES ($1, $2, $3, $4, $5)',
                [charla.id, charla.horario, charla.titulo, charla.empresa, charla.ubicacion]
            );
            console.log(`   ✅ Insertada: ${charla.titulo}`);
        }
        
        const result = await client.query('SELECT * FROM charlas ORDER BY horario');
        console.log('\n📋 CHARLAS REGISTRADAS:');
        console.table(result.rows);
        
        console.log('\n✅ ¡Charlas insertadas con éxito!');
        
    } catch (err: any) {
        console.error('❌ Error:', err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

insertCharlas();
