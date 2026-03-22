import { Pool } from 'pg';

const DATABASE_URL = 'postgresql://postgres.pkjruovvbqkziulnxqxr:26610569Facu@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function main() {
  console.log('🔌 Conectando a Supabase...');
  const client = await pool.connect();
  console.log('✅ Conexión establecida\n');

  try {
    // PASO 1: Deshabilitar RLS en todas las tablas
    console.log('🔒 Deshabilitando RLS en tablas...');
    const tables = ['charlas', 'inscriptos', 'inscriptos_charlas', 'como_te_enteraste', 'usuarios', 'inscriptos_ingresos'];
    for (const table of tables) {
      try {
        await client.query(`ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY`);
        console.log(`   ✅ ${table} - RLS deshabilitado`);
      } catch (e: any) {
        console.log(`   ⚠️  ${table} - ${e.message}`);
      }
    }
    console.log();

    // PASO 2: Recrear inscriptos_ingresos
    console.log('🔄 Recreando tabla inscriptos_ingresos...');
    await client.query('DROP TABLE IF EXISTS inscriptos_ingresos');
    await client.query(`
      CREATE TABLE inscriptos_ingresos (
        inscriptos_id VARCHAR(36) NOT NULL,
        fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_habilitante VARCHAR(36) NOT NULL,
        CONSTRAINT fk_inscriptos_ingreso 
          FOREIGN KEY (inscriptos_id) REFERENCES inscriptos(id) ON DELETE CASCADE
      )
    `);
    console.log('   ✅ Tabla recreada\n');

    // PASO 3: Crear usuario sistema
    console.log('👤 Creando usuario sistema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        nom_usuario VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL
      )
    `);
    await client.query(`
      INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Sistema', 'Validación', 'sistema_validacion', 'NO_LOGIN', 'SYSTEM_VALIDATION_SALT'
      )
      ON CONFLICT DO NOTHING
    `);
    console.log('   ✅ Usuario sistema creado/verificado\n');

    // PASO 4: Verificar opciones como_te_enteraste
    console.log('📝 Verificando como_te_enteraste...');
    const opcionesResult = await client.query('SELECT COUNT(*) as count FROM como_te_enteraste');
    const opcionesCount = parseInt(opcionesResult.rows[0].count);
    if (opcionesCount === 0) {
      await client.query(`
        INSERT INTO como_te_enteraste (id, descripcion) VALUES 
          ('RDS1', 'Redes sociales'),
          ('AMG1', 'Un amigo me contó'),
          ('INT1', 'Buscando en internet'),
          ('PRF1', 'Me lo recomendó un profesor'),
          ('FLY1', 'Vi un folleto'),
          ('OTR1', 'Otro')
        ON CONFLICT DO NOTHING
      `);
      console.log('   ✅ Opciones insertadas\n');
    } else {
      console.log(`   ✅ ${opcionesCount} opciones ya existentes\n`);
    }

    // VERIFICACIONES
    console.log('📊 VERIFICACIÓN FINAL:\n');
    
    const charlasCount = await client.query('SELECT COUNT(*) as count FROM charlas');
    console.log(`   Charlas: ${charlasCount.rows[0].count}`);
    
    const inscriptosCount = await client.query('SELECT COUNT(*) as count FROM inscriptos');
    console.log(`   Inscriptos: ${inscriptosCount.rows[0].count}`);
    
    const usuarioResult = await client.query("SELECT id, nom_usuario FROM usuarios WHERE id = '00000000-0000-0000-0000-000000000001'");
    console.log(`   Usuario sistema: ${usuarioResult.rows.length > 0 ? '✅ Existe' : '❌ No existe'}`);
    
    const opcionesResult2 = await client.query('SELECT COUNT(*) as count FROM como_te_enteraste');
    console.log(`   Opciones como_te_enteraste: ${opcionesResult2.rows[0].count}`);

    console.log('\n✅ Configuración completada!');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
