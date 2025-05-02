import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql, { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import readline from 'readline';
import logger, { logDB, logError } from '../utils/logger';

// Definición de tipos
interface Charla {
    id: string;
    horario: string;
    titulo: string;
    empresa: string;
    ubicacion: string;
    id_de_charla?: string; // Campo alternativo según los datos
}

interface DataJSON {
    charlas: Charla[];
    empresas: Record<string, any[]>;
    muestras: any[];
}

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Leer el archivo data.json
const dataPath: string = path.join(__dirname, '..', '..', 'public', 'js', 'data.json');

logger.info(`Leyendo archivo de datos: ${dataPath}`);
let data: DataJSON;

try {
    const jsonData = fs.readFileSync(dataPath, 'utf8');
    data = JSON.parse(jsonData);
    logger.info(`Archivo data.json leído correctamente. Contiene ${data.charlas?.length || 0} charlas.`);
} catch (error) {
    logError('Error al leer o parsear el archivo data.json', error);
    logger.warn('Usando datos vacíos como fallback');
    data = { charlas: [], empresas: {}, muestras: [] };
}

// Función para generar un ID de charla de 3 caracteres alfanuméricos
function generarIdCharla(indice: number): string {
    const prefijo = 'A';
    const numero = (indice + 11).toString().padStart(2, '0');
    const id = `${prefijo}${numero}`;
    logger.debug(`ID de charla generado: ${id}`);
    return id;
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

async function insertarCharlas(forzarReemplazo: boolean = false): Promise<void> {
    logger.info('Iniciando proceso de inserción de charlas desde data.json');
    const connection: PoolConnection = await pool.getConnection();
    
    try {
        // Verificar si hay charlas existentes
        logger.debug('Verificando existencia de charlas en la base de datos');
        const [charlasExistentes] = await connection.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM charlas');
        const hayCharlasExistentes: boolean = charlasExistentes[0].count > 0;

        if (hayCharlasExistentes && !forzarReemplazo) {
            logger.warn('Ya existen charlas en la base de datos y no se especificó --force');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const respuesta = await new Promise<string>((resolve) => {
                rl.question('Ya existen charlas en la base de datos. ¿Desea reemplazarlas? (s/N): ', resolve);
            });

            rl.close();

            if (respuesta.toLowerCase() !== 's' && respuesta.toLowerCase() !== 'si' && respuesta.toLowerCase() !== 'sí') {
                logger.info('Operación cancelada por el usuario');
                return;
            }
            
            logger.info('Usuario confirmó el reemplazo de charlas existentes');
        }

        // Si llegamos aquí, o bien no había charlas o el usuario confirmó el reemplazo
        await connection.beginTransaction();
        logDB('Iniciando transacción para inserción/actualización de charlas');

        if (hayCharlasExistentes) {
            // Realizar un backup antes de eliminar
            const backupPath = path.join(__dirname, '..', '..', 'sql', `backup_charlas_${Date.now()}.sql`);
            logger.info(`Creando backup de charlas existentes en ${backupPath}`);

            try {
                // Obtener las charlas actuales para backup
                const [charlasActuales] = await connection.execute<RowDataPacket[]>('SELECT * FROM charlas');
                
                // Crear script de backup
                let backupScript = `-- Backup de charlas generado automáticamente\n`;
                backupScript += `-- Fecha: ${new Date().toISOString()}\n\n`;
                
                charlasActuales.forEach((charla) => {
                    backupScript += `INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES (\n`;
                    backupScript += `    '${charla.id}', \n`;
                    backupScript += `    '${charla.horario}', \n`;
                    backupScript += `    '${charla.titulo.replace(/'/g, "\\'")}', \n`;
                    backupScript += `    '${charla.empresa.replace(/'/g, "\\'")}', \n`;
                    backupScript += `    '${charla.ubicacion.replace(/'/g, "\\'")}'\n`;
                    backupScript += `);\n`;
                });
                
                fs.writeFileSync(backupPath, backupScript);
                logger.info(`Backup de ${charlasActuales.length} charlas guardado correctamente`);
                
                // Limpiar tabla de charlas
                logger.warn('Eliminando charlas existentes de la base de datos');
                await connection.execute('DELETE FROM inscriptos_charlas');
                await connection.execute('DELETE FROM charlas');
                logDB('Tablas de charlas e inscripciones relacionadas limpiadas correctamente');
            } catch (error) {
                logError('Error al crear backup o limpiar tablas', error);
                await connection.rollback();
                return;
            }
        }

        // Insertar nuevas charlas
        let contadorInserciones = 0;
        
        // Verificar que tenemos charlas para insertar
        if (!data.charlas || data.charlas.length === 0) {
            logger.warn('No hay charlas en el archivo data.json para insertar');
            await connection.rollback();
            return;
        }

        logger.info(`Preparando para insertar ${data.charlas.length} charlas desde data.json`);
        
        // Procesar e insertar cada charla
        for (let i = 0; i < data.charlas.length; i++) {
            const charla = data.charlas[i];
            
            try {
                // Usar ID existente o generar uno nuevo
                const id = charla.id_de_charla || charla.id || generarIdCharla(i);
                
                // Normalizar la hora si es necesario
                let horario = charla.horario;
                if (!horario.includes(':')) {
                    horario = `${horario}:00`;
                    logger.debug(`Normalizado el formato de hora para ${id}: ${horario}`);
                }
                
                // Insertar charla
                logger.debug(`Insertando charla: ${id} - ${charla.titulo}`);
                await connection.execute(
                    'INSERT INTO charlas (id, horario, titulo, empresa, ubicacion) VALUES (?, ?, ?, ?, ?)',
                    [id, horario, charla.titulo, charla.empresa, charla.ubicacion]
                );
                
                contadorInserciones++;
                logDB(`Charla insertada: ID=${id}, Título=${charla.titulo}`);
                
            } catch (error: any) {
                // Manejar errores específicos
                if (error.code === 'ER_DUP_ENTRY') {
                    logger.warn(`Charla duplicada: ${charla.id || charla.id_de_charla || charla.titulo} - Omitiendo`);
                } else {
                    logError(`Error al insertar charla ${JSON.stringify(charla)}`, error);
                    throw error; // Propagar el error para el rollback
                }
            }
        }
        
        // Confirmar transacción
        await connection.commit();
        logger.info(`Proceso completado: ${contadorInserciones} charlas insertadas correctamente`);
        
    } catch (error) {
        await connection.rollback();
        logError('Error durante la inserción de charlas', error);
        process.exit(1);
    } finally {
        connection.release();
        logDB('Conexión liberada');
    }
}

// Función para procesar argumentos de línea de comandos
function procesarArgumentos(): boolean {
    const args: string[] = process.argv.slice(2);
    return args.includes('--force');
}

// Ejecutar el script
(async () => {
    try {
        const forzarReemplazo: boolean = procesarArgumentos();
        
        if (forzarReemplazo) {
            logger.warn('Modo forzado activado: se reemplazarán todas las charlas sin confirmación');
        }
        
        await insertarCharlas(forzarReemplazo);
        logger.info('Script finalizado correctamente');
        process.exit(0);
    } catch (error) {
        logError('Error general en el script', error);
        process.exit(1);
    }
})();