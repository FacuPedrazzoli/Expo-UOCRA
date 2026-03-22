import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = 'postgresql://postgres.pkjruovvbqkziulnxqxr:26610569Facu@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

function generarIdCharla(index: number): string {
  return 'C' + String(index + 1).padStart(2, '0');
}

async function main() {
  console.log('⚠️  RESET TOTAL: Se borrarán TODOS los datos. Continuando en 3 segundos...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('🔌 Conectando a Supabase...');
  const client = await pool.connect();
  console.log('✅ Conexión establecida\n');

  try {
    // Borrar en orden respetando FK
    console.log('🗑️  Borrando datos existentes...\n');
    
    await client.query('DELETE FROM inscriptos_ingresos');
    console.log('   ✅ inscriptos_ingresos vaciada');
    
    await client.query('DELETE FROM inscriptos_charlas');
    console.log('   ✅ inscriptos_charlas vaciada');
    
    await client.query('DELETE FROM inscriptos');
    console.log('   ✅ inscriptos vaciada');
    
    await client.query('DELETE FROM charlas');
    console.log('   ✅ charlas vaciada');
    
    await client.query('DELETE FROM como_te_enteraste');
    console.log('   ✅ como_te_enteraste vaciada\n');

    // Verificar conteos
    console.log('🔍 Verificando tablas vacías...');
    const tablas = ['inscriptos_ingresos', 'inscriptos_charlas', 'inscriptos', 'charlas', 'como_te_enteraste'];
    for (const tabla of tablas) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${tabla}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   ${tabla}: ${count} rows`);
    }
    console.log();

    // Re-insertar como_te_enteraste
    console.log('📝 Re-insertando como_te_enteraste...');
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
        'INSERT INTO como_te_enteraste (id, descripcion) VALUES ($1, $2)',
        [valor.id, valor.descripcion]
      );
    }
    console.log('   ✅ 6 valores insertados\n');

    // Re-insertar charlas desde data.json
    console.log('📚 Re-insertando charlas desde data.json...');
    const dataPath = path.resolve(process.cwd(), 'public/js/data.json');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const charlasData = rawData.charlas;

    for (let i = 0; i < charlasData.length; i++) {
      const charla = charlasData[i];
      const id = generarIdCharla(i);
      
      await client.query(
        'INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES ($1, $2, $3, $4, $5)',
        [id, charla.horario, charla.titulo,charla.empresa,charla.ubicacion]
      );
    }
    console.log(`   ✅ ${charlasData.length} charlas insertadas\n`);

    // Resumen final
    console.log('📋 RESUMEN FINAL:');
    for (const tabla of tablas) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${tabla}`);
      const count = parseInt(result.rows[0].count);
      console.log(`   ${tabla}: ${count} rows`);
    }

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
