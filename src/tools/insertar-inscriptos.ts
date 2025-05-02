import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import dotenv from 'dotenv';
import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import logger, { logDB, logError } from '../utils/logger';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Definición de tipos
interface Usuario {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    enterado_id: string;
}

interface Relacion {
    usuarioId: string;
    charlaId: string;
}

interface FuenteInfo {
    id: string;
    descripcion: string;
}

// Crear pool de conexión directamente en este script
const pool: Pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "inscripciones",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Datos expandidos para generar usuarios aleatorios
const nombres: string[] = [
    'Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Laura', 'Miguel', 'Sofía',
    'Fernando', 'Gabriela', 'Ricardo', 'Valentina', 'Diego', 'Lucía', 'Javier',
    'Paula', 'Martín', 'Camila', 'Roberto', 'Mariana', 'Eduardo', 'Daniela',
    'Andrés', 'Carolina', 'Francisco', 'Victoria', 'Alejandro', 'Natalia',
    'José', 'Alicia', 'Esteban', 'Mónica', 'Jorge', 'Silvia', 'Alberto', 'Patricia',
    'Luis', 'Andrea', 'Manuel', 'Isabel', 'Gustavo', 'Valeria', 'Raúl', 'Cecilia',
    'Felipe', 'Adriana', 'Arturo', 'Elena', 'Sebastián', 'Marcela', 'Emilio', 'Julia',
    'Mario', 'Carla', 'David', 'Lorena', 'Leonardo', 'Romina', 'Cristian', 'Beatriz',
    'Pablo', 'Susana', 'Gonzalo', 'Mercedes', 'Ignacio', 'Claudia', 'Santiago', 'Paola'
];

const apellidos: string[] = [
    'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'García',
    'Sánchez', 'Romero', 'Torres', 'Díaz', 'Moreno', 'Álvarez', 'Ruiz', 'Ramírez',
    'Hernández', 'Acosta', 'Benítez', 'Flores', 'Medina', 'Rojas', 'Vargas', 'Silva',
    'Castro', 'Ortega', 'Núñez', 'Ramos', 'Pereyra', 'Giménez', 'Molina', 'Vega',
    'Gómez', 'Luna', 'Aguirre', 'Ríos', 'Ferreyra', 'Suárez', 'Cabrera', 'Herrera',
    'Mendoza', 'Gutiérrez', 'Paz', 'Juárez', 'Ponce', 'Russo', 'Navarro', 'Méndez',
    'Correa', 'Ledesma', 'Miranda', 'Figueroa', 'Blanco', 'Villalba', 'Maldonado',
    'Godoy', 'Arias', 'Sosa', 'Oliva', 'Quiroga', 'Duarte', 'Campos', 'Rivero'
];

// Ampliamos los dominios para tener más variedad
const dominios: string[] = [
    'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com',
    'mail.com', 'live.com', 'yahoo.com.ar', 'hotmail.es', 'outlook.es',
    'protonmail.com', 'fastmail.com', 'yandex.com', 'gmx.com', 'aol.com',
    'zoho.com', 'tutanota.com', 'yahoo.co.uk', 'gmail.co.uk', 'mail.ru',
    'inbox.com', 'yahoo.fr', 'gmail.fr', 'yahoo.de', 'gmail.de',
    'yahoo.es', 'yahoo.mx', 'gmail.mx', 'yahoo.cl', 'gmail.cl'
];

// Función para generar un número aleatorio entre min y max (inclusive)
function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Función para generar un DNI aleatorio único
function generarDNI(dniUsados: Set<string>): string {
    let dni: string;
    let intentos: number = 0;
    const maxIntentos: number = 100;

    do {
        dni = String(getRandomInt(10000000, 50000000));
        intentos++;
        if (intentos > maxIntentos) {
            logger.warn(`Superado número máximo de intentos (${maxIntentos}) generando DNI único, generando número más largo`);
            dni = String(getRandomInt(100000000, 999999999));
        }
    } while (dniUsados.has(dni));

    dniUsados.add(dni);
    logger.debug(`DNI generado: ${dni}`);
    return dni;
}

// Función mejorada para generar un email aleatorio único
function generarEmail(nombre: string, apellido: string, emailsUsados: Set<string>): string {
    const nombreNormalizado: string = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const apellidoNormalizado: string = apellido.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    let email: string;
    let intentos: number = 0;
    const maxIntentos: number = 30;

    do {
        const dominio: string = dominios[getRandomInt(0, dominios.length - 1)];
        const separador: string = [".", "_", "-", ""][getRandomInt(0, 3)];

        const formatoEmail: number = getRandomInt(0, 9);
        let baseEmail: string;

        switch (formatoEmail) {
            case 0:
                baseEmail = `${nombreNormalizado}${separador}${apellidoNormalizado}`;
                break;
            case 1:
                baseEmail = `${apellidoNormalizado}${separador}${nombreNormalizado}`;
                break;
            case 2:
                baseEmail = `${nombreNormalizado.charAt(0)}${separador}${apellidoNormalizado}`;
                break;
            case 3:
                baseEmail = `${nombreNormalizado}${separador}${apellidoNormalizado.charAt(0)}`;
                break;
            case 4:
                baseEmail = nombreNormalizado;
                break;
            case 5:
                baseEmail = apellidoNormalizado;
                break;
            case 6:
                baseEmail = `${nombreNormalizado}${getRandomInt(1, 9999)}`;
                break;
            case 7:
                baseEmail = `${apellidoNormalizado}${getRandomInt(1, 9999)}`;
                break;
            case 8:
                baseEmail = `${nombreNormalizado}${separador}${apellidoNormalizado}${getRandomInt(1, 9999)}`;
                break;
            case 9:
                baseEmail = `${nombreNormalizado.charAt(0)}${apellidoNormalizado.charAt(0)}${getRandomInt(1000, 9999)}`;
                break;
            default:
                baseEmail = `${nombreNormalizado}${separador}${apellidoNormalizado}`;
        }

        if (intentos > 0) {
            baseEmail = `${baseEmail}${intentos + getRandomInt(100, 99999)}`;
        }

        email = `${baseEmail}@${dominio}`;
        intentos++;

        if (intentos > maxIntentos) {
            logger.warn(`Superado máximo de intentos (${maxIntentos}) generando email único para ${nombreNormalizado} ${apellidoNormalizado}`);
            const randomString: string = Math.random().toString(36).substring(2, 10);
            email = `user_${randomString}${getRandomInt(1000, 9999)}@${dominio}`;
        }
    } while (emailsUsados.has(email) && intentos <= maxIntentos + 5);

    emailsUsados.add(email);
    logger.debug(`Email generado: ${email}`);
    return email;
}

// Función para verificar si un email ya existe en la base de datos
async function emailExisteEnBD(connection: PoolConnection, email: string): Promise<boolean> {
    try {
        logDB(`Verificando existencia del email: ${email} en la base de datos`);
        const [rows] = await connection.execute<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM inscriptos WHERE email = ?',
            [email]
        );
        const existe = rows[0].count > 0;
        if (existe) {
            logger.debug(`Email ${email} ya existe en la base de datos`);
        }
        return existe;
    } catch (error) {
        logError("Error al verificar email en BD", error);
        return false;
    }
}

// Función para generar un email único verificado contra la base de datos
async function generarEmailUnico(connection: PoolConnection, nombre: string, apellido: string, emailsUsados: Set<string>): Promise<string> {
    let email: string;
    let intentos: number = 0;
    const maxIntentos: number = 10;

    do {
        email = generarEmail(nombre, apellido, emailsUsados);
        const existeEnBD: boolean = await emailExisteEnBD(connection, email);
        if (!existeEnBD) {
            break;
        }
        intentos++;

        if (intentos > maxIntentos) {
            logger.warn(`No se pudo generar un email único después de ${maxIntentos} intentos para ${nombre} ${apellido}`);
            const timestamp: number = Date.now();
            const random: string = Math.random().toString(36).substring(2, 8);
            email = `usuario_${timestamp}_${random}@${dominios[getRandomInt(0, dominios.length - 1)]}`;
        }
    } while (emailsUsados.has(email) && intentos <= maxIntentos);

    emailsUsados.add(email);
    logger.info(`Email único generado para ${nombre} ${apellido}: ${email}`);
    return email;
}

async function generarUsuariosAleatorios(cantidadUsuarios: number = 50): Promise<void> {
    logger.info(`Iniciando generación de ${cantidadUsuarios} usuarios aleatorios`);
    
    try {
        const connection: PoolConnection = await pool.getConnection();
        logger.info('Conexión a MySQL establecida correctamente');

        try {
            logger.debug('Verificando existencia de tabla como_te_enteraste');
            const [tableCheck] = await connection.execute<RowDataPacket[]>(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = ? 
                AND table_name = ?`,
                [process.env.DB_NAME || 'inscripciones', 'como_te_enteraste']
            );

            if (tableCheck[0].count === 0) {
                logger.error('La tabla como_te_enteraste no existe. Debe crearla antes de continuar.');
                connection.release();
                return;
            }

            logger.debug('Obteniendo IDs de fuentes de información');
            const [comoTeEnterasteRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM como_te_enteraste');

            if (comoTeEnterasteRows.length === 0) {
                logger.warn('No hay registros en como_te_enteraste. Insertando datos predeterminados...');

                const fuentesInfo: FuenteInfo[] = [
                    { id: 'RS01', descripcion: 'Redes Sociales' },
                    { id: 'AM02', descripcion: 'Amigo/Familiar' },
                    { id: 'EM03', descripcion: 'Email' },
                    { id: 'WEB4', descripcion: 'Sitio Web' },
                    { id: 'OT05', descripcion: 'Otro' }
                ];

                logger.info(`Insertando ${fuentesInfo.length} registros de fuentes de información predeterminadas`);
                for (const fuente of fuentesInfo) {
                    try {
                        await connection.execute(
                            'INSERT INTO como_te_enteraste (id, descripcion) VALUES (?, ?)',
                            [fuente.id, fuente.descripcion]
                        );
                        logger.debug(`Insertada fuente: ${fuente.id} - ${fuente.descripcion}`);
                    } catch (err: any) {
                        if (err.code !== 'ER_DUP_ENTRY') {
                            logError(`Error al insertar fuente: ${fuente.id}`, err);
                            throw err;
                        } else {
                            logger.warn(`La fuente ${fuente.id} ya existe, se omite la inserción`);
                        }
                    }
                }

                logger.debug('Obteniendo IDs de fuentes después de inserción');
                const [newRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM como_te_enteraste');
                comoTeEnterasteRows.push(...newRows);
            }

            const como_te_enteraste_ids: string[] = comoTeEnterasteRows.map(row => row.id);
            logger.info(`Se encontraron ${como_te_enteraste_ids.length} fuentes de información disponibles`);

            logger.debug('Verificando charlas existentes');
            const [charlasRows] = await connection.execute<RowDataPacket[]>('SELECT id FROM charlas');

            let charlas: string[] = charlasRows.map(row => row.id);
            if (charlas.length === 0) {
                logger.warn('No hay charlas en la base de datos. Usando valores predeterminados.');
                charlas = ['A11', 'A12', 'A13', 'A14', 'A15', 'A16'];
            }
            logger.info(`Se encontraron ${charlas.length} charlas disponibles`);

            const dniUsados: Set<string> = new Set();
            const emailsUsados: Set<string> = new Set();

            logger.debug('Cargando emails existentes para evitar duplicados');
            const [emailsExistentes] = await connection.execute<RowDataPacket[]>('SELECT email FROM inscriptos');
            emailsExistentes.forEach(row => emailsUsados.add(row.email));
            logger.info(`Se cargaron ${emailsUsados.size} emails existentes para evitar duplicados`);

            await connection.beginTransaction();
            logDB(`Iniciando transacción para insertar ${cantidadUsuarios} usuarios`);

            const tamañoLote: number = 100;
            let usuariosInsertados: number = 0;

            for (let lote = 0; lote < Math.ceil(cantidadUsuarios / tamañoLote); lote++) {
                const cantidadEnLote: number = Math.min(tamañoLote, cantidadUsuarios - (lote * tamañoLote));
                logger.info(`Procesando lote ${lote + 1} con ${cantidadEnLote} usuarios...`);

                const usuarios: Usuario[] = [];
                const relaciones: Relacion[] = [];

                for (let i = 0; i < cantidadEnLote; i++) {
                    try {
                        const id: string = uuidv4();
                        const nombre: string = nombres[getRandomInt(0, nombres.length - 1)];
                        const apellido: string = apellidos[getRandomInt(0, apellidos.length - 1)];
                        const dni: string = generarDNI(dniUsados);

                        const email: string = await generarEmailUnico(connection, nombre, apellido, emailsUsados);

                        const enterado_id: string = como_te_enteraste_ids[getRandomInt(0, como_te_enteraste_ids.length - 1)];

                        usuarios.push({ id, nombre, apellido, dni, email, enterado_id });
                        logger.debug(`Usuario generado: ${nombre} ${apellido}, DNI: ${dni}`);

                        const charlaId: string = charlas[getRandomInt(0, charlas.length - 1)];
                        relaciones.push({ usuarioId: id, charlaId });
                        logger.debug(`Relación generada: Usuario ${id} con Charla ${charlaId}`);
                    } catch (err) {
                        logError(`Error generando datos para usuario ${i + 1} del lote ${lote + 1}`, err);
                    }
                }

                logger.info(`Insertando ${usuarios.length} usuarios en la base de datos`);
                for (const usuario of usuarios) {
                    try {
                        const [emailCheck] = await connection.execute<RowDataPacket[]>(
                            'SELECT COUNT(*) as count FROM inscriptos WHERE email = ?',
                            [usuario.email]
                        );

                        if (emailCheck[0].count > 0) {
                            logger.warn(`Email duplicado detectado: ${usuario.email} - Generando uno nuevo`);
                            usuario.email = await generarEmailUnico(connection, usuario.nombre, usuario.apellido, emailsUsados);
                        }

                        await connection.execute(
                            `INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [usuario.id, usuario.nombre, usuario.apellido, usuario.dni, usuario.email, usuario.enterado_id]
                        );
                        usuariosInsertados++;
                        logDB(`Usuario insertado: ${usuario.nombre} ${usuario.apellido}, ID: ${usuario.id}`);
                    } catch (err: any) {
                        logError(`Error insertando usuario ${usuario.nombre} ${usuario.apellido}`, err);
                    }
                }

                logger.info(`Insertando ${relaciones.length} relaciones usuario-charla`);
                for (const rel of relaciones) {
                    try {
                        const [userCheck] = await connection.execute<RowDataPacket[]>(
                            'SELECT COUNT(*) as count FROM inscriptos WHERE id = ?',
                            [rel.usuarioId]
                        );

                        if (userCheck[0].count > 0) {
                            await connection.execute(
                                `INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) 
                                 VALUES (?, ?)`,
                                [rel.usuarioId, rel.charlaId]
                            );
                            logDB(`Relación insertada: Usuario ${rel.usuarioId} - Charla ${rel.charlaId}`);
                        }
                    } catch (err: any) {
                        logError(`Error insertando relación charla para usuario ${rel.usuarioId}`, err);
                    }
                }

                logger.info(`Lote ${lote + 1} completado, ${usuariosInsertados} usuarios insertados hasta ahora.`);
            }

            await connection.commit();
            logger.info(`¡Éxito! Se insertaron ${usuariosInsertados} usuarios en total, cada uno con una inscripción a charla.`);

        } catch (err) {
            await connection.rollback();
            logError('Error al insertar datos en la base de datos', err);
        } finally {
            connection.release();
            logDB(`Conexión liberada`);
        }
    } catch (err) {
        logError('Error al conectar con la base de datos', err);
    }
}

// Función para procesar argumentos de línea de comandos
function procesarArgumentos(): number {
    const args: string[] = process.argv.slice(2);
    let cantidad: number = 50;

    if (args.length > 0) {
        const parsed: number = parseInt(args[0], 10);
        if (!isNaN(parsed) && parsed > 0) {
            cantidad = parsed;
        } else {
            logger.error('Error: La cantidad de usuarios debe ser un número mayor a 0.');
            process.exit(1);
        }
    }

    return cantidad;
}

// Execute the function with an async wrapper
(async (): Promise<void> => {
    try {
        const cantidadUsuarios: number = procesarArgumentos();
        logger.info(`Se generarán ${cantidadUsuarios} usuarios aleatorios...`);

        await generarUsuariosAleatorios(cantidadUsuarios);
    } catch (error) {
        logError('Error en la ejecución', error);
        process.exit(1);
    }
})();