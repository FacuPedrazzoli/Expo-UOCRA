import { Router, Response } from "express";
import { OkPacket, RowDataPacket, PoolConnection } from "mysql2/promise";
import pool from "../database/database";
import dotenv from "dotenv";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import logger, { logDB, logError } from "../utils/logger";

// Cargar variables de entorno desde el archivo .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Interfaces para los datos
interface RequiredFields {
    nombre?: string;
    apellido?: string;
    dni?: string;
    email?: string;
    como_te_enteraste?: string;
    charla?: string;
    [key: string]: any;
}

const router = Router();

// Endpoint para registrar una inscripción
router.post("/", async (req, res) => {
    let conexion: PoolConnection | undefined;
    try {
        logger.info(`Nueva inscripción recibida: ${req.body.nombre} ${req.body.apellido}`);
        logger.debug("Datos recibidos en el servidor:", req.body);
        
        const { nombre, apellido, dni, email, como_te_enteraste, charla} = req.body;
        const id = req.body.id || generarUUID(); // Usar ID proporcionado o generar uno nuevo

        // Validación mejorada
        validateRequiredFields({ nombre, apellido, dni, email, como_te_enteraste, charla }, res);

        conexion = await pool.getConnection();
        await conexion.beginTransaction();
        logDB(`Iniciando transacción para inscripción de ${nombre} ${apellido}`);

        // Obtener ID válido para como_te_enteraste con mejores mensajes de error
        const comoTeEnterasteId = await getValidComoTeEnterasteId(conexion, como_te_enteraste);

        // Verificar duplicados con mensaje claro
        await checkExistingUser(conexion, email, dni);

        // Insertar usuario
        await insertUser(conexion, id, nombre, apellido, dni, email, comoTeEnterasteId);

        // Obtener ID válido de charla
        const idCharla = await getValidCharlaId(conexion, charla);

        // Relacionar usuario con charla
        await conexion.execute(
            "INSERT INTO inscriptos_charlas (inscriptos_id, charlas_id) VALUES (?, ?)",
            [id, idCharla]
        );
        logDB(`Usuario ${id} inscripto a charla ${idCharla}`);

        await conexion.commit();
        logger.info(`Transacción completada exitosamente para ${nombre} ${apellido} (${dni})`);

        res.status(201).json({
            mensaje: "Inscripción guardada correctamente",
            id,
            idCharla
        });

    } catch (error) {
        if (conexion) {
            await conexion.rollback().catch(err => 
                logError("Error al hacer rollback", err)
            );
            logDB("Transacción cancelada por error");
        }
        handleError(error as Error, res);
    } finally {
        if (conexion) conexion.release();
    }
});

// Helper functions to make code more modular and readable
function validateRequiredFields(fields: RequiredFields, res: Response): void {
    const camposFaltantes = Object.entries(fields)
        .filter(([_, valor]) => valor === undefined || valor === null || valor === "")
        .map(([clave]) => clave);

    if (camposFaltantes.length > 0) {
        logger.warn(`Campos faltantes en el formulario: ${camposFaltantes.join(', ')}`);
        res.status(400).json({
            error: "Campos obligatorios faltantes",
            campos: camposFaltantes
        });
        throw new Error("Campos obligatorios faltantes");
    }
}

// Obtener ID válido para como_te_enteraste con mejores mensajes de error
async function getValidComoTeEnterasteId(conexion: PoolConnection, como_te_enteraste: string): Promise<string> {
    // Verificar si el valor de como_te_enteraste existe en la tabla como_te_enteraste
    const [comoTeEnterasteCheck] = await conexion.execute(
        "SELECT id FROM como_te_enteraste WHERE id = ?",
        [como_te_enteraste]
    ) as [RowDataPacket[], any];

    let comoTeEnterasteId: string;

    // Si existe el ID exacto, úsalo
    if (comoTeEnterasteCheck.length > 0) {
        comoTeEnterasteId = comoTeEnterasteCheck[0].id;
        logDB(`Usando ID exacto para como_te_enteraste: ${comoTeEnterasteId}`);
    } else {
        // Si no existe, buscar por descripción como fallback
        const [comoTeEnterasteResult] = await conexion.execute(
            "SELECT id FROM como_te_enteraste WHERE descripcion LIKE ?",
            [`%${como_te_enteraste}%`]
        ) as [RowDataPacket[], any];

        if (comoTeEnterasteResult.length > 0) {
            comoTeEnterasteId = comoTeEnterasteResult[0].id;
            logDB(`Usando ID por coincidencia para como_te_enteraste: ${comoTeEnterasteId}`);
        } else {
            // Si tampoco encontramos por descripción, obtener el primer ID válido como plan B
            const [defaultOption] = await conexion.execute(
                "SELECT id FROM como_te_enteraste LIMIT 1"
            ) as [RowDataPacket[], any];

            if (defaultOption.length > 0) {
                comoTeEnterasteId = defaultOption[0].id;
                logger.warn(`Usando ID predeterminado para como_te_enteraste: ${comoTeEnterasteId}`);
            } else {
                // Si no hay opciones en la tabla, registrar el error y fallar
                logger.error("No hay opciones válidas en la tabla como_te_enteraste");
                throw new Error("No hay opciones válidas en la tabla como_te_enteraste");
            }
        }
    }
    return comoTeEnterasteId;
}

// Verificar duplicados con mensaje claro
async function checkExistingUser(conexion: PoolConnection, email: string, dni: string): Promise<void> {
    // Verificar si el email o DNI ya existen en la tabla correcta (inscriptos)
    const [usuariosExistentes] = await conexion.execute(
        "SELECT * FROM inscriptos WHERE dni = ?",
        [email, dni]
    ) as [RowDataPacket[], any];

    if (usuariosExistentes.length > 0) {
        logger.warn(`Intento de inscripción duplicada DNI: ${dni}`);
        throw new Error("Ya existe un usuario registrado con este DNI");
    }
}

// Insertar usuario
async function insertUser(
    conexion: PoolConnection,
    id: string,
    nombre: string,
    apellido: string,
    dni: string,
    email: string,
    comoTeEnterasteId: string
): Promise<void> {
    // Insertar participante en la tabla correcta (inscriptos)
    await conexion.execute(
        "INSERT INTO inscriptos (id, nombre, apellido, dni, email, como_te_enteraste_fk) VALUES (?, ?, ?, ?, ?, ?)",
        [id, nombre, apellido, dni, email, comoTeEnterasteId]
    );
    logDB(`Usuario insertado correctamente: ${id}, ${nombre} ${apellido}`);
}

// Obtener ID válido de charla
async function getValidCharlaId(conexion: PoolConnection, charla: string): Promise<string> {
    // Verificar si la charla existe por su ID
    const [charlasExistentes] = await conexion.execute(
        "SELECT id, titulo FROM charlas WHERE id = ?",
        [charla]
    ) as [RowDataPacket[], any];

    let idCharla = charla;

    if (charlasExistentes.length === 0) {
        // La charla no existe, pero podemos intentar buscarla por su título
        const [charlaPorTitulo] = await conexion.execute(
            "SELECT id FROM charlas WHERE titulo LIKE ?",
            [`%${charla}%`]
        ) as [RowDataPacket[], any];

        if (charlaPorTitulo.length > 0) {
            idCharla = charlaPorTitulo[0].id;
            logger.warn(`Usando ID de charla por coincidencia de título: ${idCharla}`);
        } else {
            logger.error(`La charla seleccionada no existe: ${charla}`);
            throw new Error("La charla seleccionada no existe");
        }
    }
    return idCharla;
}

// Generic error handler
function handleError(error: Error, res: Response): void {
    const message = error.message || "Error desconocido";
    logError("Error en endpoint de inscripción", error);
    
    // Solo enviar respuesta si no se ha enviado ya
    if (!res.headersSent) {
        res.status(500).json({
            error: "Error al procesar la solicitud",
            mensaje: message
        });
    }
}

// Endpoint para obtener todas las charlas
router.get("/charlas", async (req, res) => {
    try {
        logger.info("Solicitud de listado de charlas");
        const conexion = await pool.getConnection();
        try {
            // Obtenemos las charlas según el esquema correcto
            const [charlas] = await conexion.query<RowDataPacket[]>(`
                SELECT 
                    c.id as id, 
                    c.titulo, 
                    c.horario,
                    c.empresa,
                    c.ubicacion,
                    (SELECT COUNT(*) FROM inscriptos_charlas WHERE charlas_id = c.id) as participantes
                FROM charlas c
            `);
            
            logDB(`Se encontraron ${charlas.length} charlas en la base de datos`);

            // Transformamos el formato de las charlas para que coincida con lo esperado en el frontend
            const charlasFormateadas = charlas.map(charla => {
                // Dar formato a la fecha/hora
                let horaInicio, horaFin;

                // Verificar si horario es una fecha o un string de formato 'HH:MM'
                if (charla.horario instanceof Date) {
                    const horarioDate = new Date(charla.horario);
                    horaInicio = horarioDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    horaFin = new Date(horarioDate.getTime() + 45 * 60000)
                        .toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                } else if (typeof charla.horario === 'string' && charla.horario.includes(':')) {
                    // Si es un formato como '13:00'
                    horaInicio = charla.horario;

                    // Calcular hora fin (sumando 45 minutos)
                    const [horas, minutos] = charla.horario.split(':').map(Number);
                    let horasFinales = horas;
                    let minutosFinales = minutos + 45;

                    if (minutosFinales >= 60) {
                        horasFinales += 1;
                        minutosFinales -= 60;
                    }

                    horaFin = `${horasFinales.toString().padStart(2, '0')}:${minutosFinales.toString().padStart(2, '0')}`;
                } else {
                    // Formato predeterminado si no podemos determinar
                    horaInicio = '00:00';
                    horaFin = '00:45';
                }

                return {
                    id: charla.id,
                    horario: `${horaInicio} - ${horaFin}`,
                    titulo: charla.titulo || "Charla sin título",
                    empresa: charla.empresa || "UOCRA Formación",
                    ubicacion: charla.ubicacion || "Aula Principal",
                    capacidad_maxima: 50,
                    descripcion: charla.titulo || "Charla sin título",
                    participantes: charla.participantes || 0
                };
            });

            res.status(200).json(charlasFormateadas);
            logger.debug(`Enviadas ${charlasFormateadas.length} charlas formateadas al cliente`);
        } finally {
            conexion.release();
        }
    } catch (error: any) {
        logError("Error al obtener charlas", error);
        res.status(500).json({
            error: "Error al obtener charlas",
            mensaje: error.message
        });
    }
});

// Endpoint para obtener todas las opciones de "cómo te enteraste"
router.get("/como-te-enteraste", async (req, res) => {
    try {
        logger.info("Solicitud de opciones de 'cómo te enteraste'");
        const conexion = await pool.getConnection();
        try {
            // Obtenemos las opciones de "cómo te enteraste"
            const [opciones] = await conexion.query<RowDataPacket[]>(`
                SELECT 
                    id, 
                    descripcion 
                FROM como_te_enteraste
                ORDER BY descripcion
            `);

            logger.debug(`Enviando ${opciones.length} opciones de 'cómo te enteraste'`);
            res.json(opciones);
        } catch (error: any) {
            logError("Error al consultar las opciones", error);
            res.status(500).json({
                error: "Error al obtener las opciones",
                mensaje: error.message
            });
        } finally {
            conexion.release();
        }
    } catch (error: any) {
        logError("Error general en endpoint como-te-enteraste", error);
        res.status(500).json({
            error: "Error al procesar la solicitud",
            mensaje: error.message
        });
    }
});

// Endpoint para recibir logs del cliente
router.post("/logs", (req, res) => {
    try {
        const { level, message, timestamp, data } = req.body;
        
        // Validar los datos mínimos
        if (!level || !message) {
            return res.status(400).json({ error: "Faltan datos requeridos (level, message)" });
        }
        
        // Registrar según nivel
        switch(level.toLowerCase()) {
            case 'error':
                logger.error(`[Cliente] ${message}`, data);
                break;
            case 'warn':
                logger.warn(`[Cliente] ${message}`, data);
                break;
            case 'info':
                logger.info(`[Cliente] ${message}`, data);
                break;
            default:
                logger.debug(`[Cliente] ${message}`, data);
        }
        
        res.status(202).end(); // Aceptado, sin contenido
    } catch (error) {
        logger.error("Error al procesar log del cliente", { error });
        res.status(500).end(); // No enviamos detalles al cliente
    }
});

// Función auxiliar para generar UUID
function generarUUID(): string {
    return uuidv4();
}

export default router;