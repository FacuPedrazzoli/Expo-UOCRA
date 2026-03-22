import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function generarIdCharla(index: number): string {
  return 'C' + String(index + 1).padStart(2, '0');
}

async function main() {
  console.log('🔌 Conectando a Supabase...');
  const client = await pool.connect();
  console.log('✅ Conexión establecida\n');

  try {
    // Leer data.json
    const dataPath = path.resolve(process.cwd(), 'public/js/data.json');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const charlasData = rawData.charlas;

    console.log(`📚 Obtenidas ${charlasData.length} charlas de data.json\n`);

    // Borrar en orden: primero inscriptos_charlas, luego charlas
    console.log('🗑️  Borrando charlas existentes...');
    await client.query('DELETE FROM inscriptos_charlas');
    await client.query('DELETE FROM charlas');
    console.log('✅ Charlas borradas\n');

    // Verificar si como_te_enteraste está vacía
    const comoTeEnterasteResult = await client.query('SELECT COUNT(*) as count FROM como_te_enteraste');
    const comoTeEnterasteCount = parseInt(comoTeEnterasteResult.rows[0].count);
    
    if (comoTeEnterasteCount === 0) {
      console.log('📝 Insertando valores base en como_te_enteraste...');
      const valoresBase = [
        { id: 'RDS1', descripcion: 'Redes sociales' },
        { id: 'AMG1', descripcion: 'Un amigo me conto' },
        { id: 'INT1', descripcion: 'Buscando en internet' },
        { id: 'PRF1', descripcion: 'Me lo recomendo un profesor' },
        { id: 'FLY1', descripcion: 'Vi un folleto' },
        { id: 'OTR1', descripcion: 'Otro' },
      ];
      
      for (const valor of valoresBase) {
        await client.query(
          'INSERT INTO como_te_enteraste (id, descripcion) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [valor.id, valor.descripcion]
        );
      }
      console.log('✅ Valores base insertados en como_te_enteraste\n');
    }

    // Insertar charlas
    console.log('📝 Insertando charlas...');
    for (let i = 0; i < charlasData.length; i++) {
      const charla = charlasData[i];
      const id = generarIdCharla(i);
      
      await client.query(
        'INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES ($1, $2, $3, $4, $5)',
        [id, charla.horario, charla.titulo, charla.empresa, charla.ubicacion]
      );
      console.log(`   ✅ ${id}: ${charla.titulo}`);
    }

    console.log('\n📋 RESUMEN:');
    console.log(`   ✅ Charlas insertadas: ${charlasData.length}`);

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
