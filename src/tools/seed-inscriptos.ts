import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const NOMBRES = [
  'Lucas', 'Martin', 'Santiago', 'Facundo', 'Nicolas',
  'Valentina', 'Sofia', 'Camila', 'Lucia', 'Florencia',
  'Diego', 'Agustin', 'Matias', 'Tomas', 'Hernan',
  'Paula', 'Natalia', 'Romina', 'Vanesa', 'Cecilia'
];

const APELLIDOS = [
  'Gonzalez', 'Rodriguez', 'Gomez', 'Fernandez', 'Lopez',
  'Diaz', 'Martinez', 'Perez', 'Garcia', 'Sanchez',
  'Romero', 'Sosa', 'Torres', 'Ramirez', 'Flores',
  'Acosta', 'Medina', 'Reyes', 'Herrera', 'Morales'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDNI(): string {
  return String(Math.floor(Math.random() * 25000000) + 20000000);
}

function generateEmail(nombre: string, apellido: string): string {
  const randomNum = Math.floor(Math.random() * 1000);
  return `${nombre.toLowerCase()}.${apellido.toLowerCase()}${randomNum}@ejemplo.com`;
}

async function main() {
  console.log('🔌 Conectando a Supabase...');
  const client = await pool.connect();
  console.log('✅ Conexión establecida\n');

  let insertados = 0;
  let errores = 0;
  let validados = 0;
  const dnisGenerados: { dni: string; validado: boolean }[] = [];

  try {
    // Obtener charlas existentes
    console.log('📚 Obteniendo charlas existentes...');
    const charlasResult = await client.query('SELECT id FROM charlas ORDER BY id');
    const charlas = charlasResult.rows;
    
    if (charlas.length === 0) {
      console.error('❌ Error: No hay charlas en la base de datos. Ejecutá seed:charlas primero.');
      process.exit(1);
    }
    console.log(`   ✅ ${charlas.length} charlas encontradas\n`);

    // Obtener opciones de como_te_enteraste
    console.log('📝 Obteniendo opciones de como_te_enteraste...');
    let comoTeEnterasteResult = await client.query('SELECT id FROM como_te_enteraste');
    let comoTeEnteraste = comoTeEnterasteResult.rows;

    if (comoTeEnteraste.length === 0) {
      console.log('   ⚠️  No hay opciones, insertando valores base...');
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
      
      comoTeEnterasteResult = await client.query('SELECT id FROM como_te_enteraste');
      comoTeEnteraste = comoTeEnterasteResult.rows;
      console.log(`   ✅ ${comoTeEnteraste.length} opciones disponibles\n`);
    }

    // Verificar/Crear usuario sistema
    console.log('🔐 Verificando usuario sistema para validación...');
    const usuarioSistemaId = '00000000-0000-0000-0000-000000000001';
    
    const checkUsuario = await client.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [usuarioSistemaId]
    );

    if (checkUsuario.rows.length === 0) {
      await client.query(
        `INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT DO NOTHING`,
        [usuarioSistemaId, 'Sistema', 'Validacion', 'sistema_validacion', 'NO_LOGIN', 'SYSTEM_SALT']
      );
      console.log('   ✅ Usuario sistema creado\n');
    } else {
      console.log('   ✅ Usuario sistema ya existe\n');
    }

    // Generar 50 inscriptos
    console.log('👥 Generando 50 inscriptos aleatorios...\n');

    for (let i = 0; i < 50; i++) {
      const nombre = getRandomElement(NOMBRES);
      const apellido = getRandomElement(APELLIDOS);
      const dni = generateDNI();
      const email = generateEmail(nombre, apellido);
      const id = uuidv4();
      const comoTeEnterasteId = getRandomElement(comoTeEnteraste).id;

      // Seleccionar 1-3 charlas aleatorias
      const numCharlas = Math.floor(Math.random() * 3) + 1;
      const charlasSeleccionadas: string[] = [];
      const charlasCopia = [...charlas];
      
      for (let j = 0; j < numCharlas && charlasCopia.length > 0; j++) {
        const idx = Math.floor(Math.random() * charlasCopia.length);
        charlasSeleccionadas.push(charlasCopia.splice(idx, 1)[0].id);
      }

      try {
        // Insertar inscripto
        await client.query(
          `INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk, fecha_registro, validado)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), false)`,
          [id, nombre, apellido, dni, email, comoTeEnterasteId]
        );

        // Insertar relaciones con charlas
        for (const charlaId of charlasSeleccionadas) {
          await client.query(
            'INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) VALUES ($1, $2)',
            [id, charlaId]
          );
        }

        insertados++;
        dnisGenerados.push({ dni, validado: false });

      } catch (err: any) {
        if (err.code === '23505') { // Unique violation
          errores++;
          continue;
        }
        throw err;
      }
    }

    // Marcar entre 15 y 25 como validados
    const numValidados = Math.floor(Math.random() * 11) + 15; // 15 a 25
    const indicesValidados = new Set<number>();
    
    while (indicesValidados.size < numValidados && indicesValidados.size < insertados) {
      const idx = Math.floor(Math.random() * dnisGenerados.length);
      if (!dnisGenerados[idx].validado) {
        indicesValidados.add(idx);
      }
    }

    for (const idx of indicesValidados) {
      const inscriptoResult = await client.query(
        'SELECT id FROM inscriptos WHERE dni = $1',
        [dnisGenerados[idx].dni]
      );
      
      if (inscriptoResult.rows.length > 0) {
        await client.query(
          'INSERT INTO inscriptos_ingresos (inscriptos_id, fecha_ingreso, usuario_habilitante) VALUES ($1, NOW(), $2)',
          [inscriptoResult.rows[0].id, usuarioSistemaId]
        );
        dnisGenerados[idx].validado = true;
        validados++;
      }
    }

    // Imprimir resumen
    console.log('\n📋 RESUMEN:');
    console.log(`   ✅ Inscriptos insertados: ${insertados}`);
    console.log(`   ✅ Marcados como validados: ${validados}`);
    console.log(`   ❌ Errores (DNI/email duplicado): ${errores}\n`);

    // Mezclar y mostrar 5 DNIs
    const dnisMezclados = [...dnisGenerados].sort(() => Math.random() - 0.5);
    const dnisAMostrar = dnisMezclados.slice(0, 5);

    console.log('🔑 DNIs para probar en /admin-validacion:');
    for (const item of dnisAMostrar) {
      const estado = item.validado ? 'VALIDADO' : 'PENDIENTE';
      console.log(`   → ${item.dni}  estado: ${estado}`);
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
