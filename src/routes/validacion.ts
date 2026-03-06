/**
 * Rutas de validación de inscriptos — Sección oculta /admin-validacion
 * 
 * Hallazgos del análisis de BD:
 *   - Tabla: inscriptos
 *   - DNI: campo `dni` VARCHAR(20) UNIQUE NOT NULL (string, exact match)
 *   - Nombre: separado en `nombre` VARCHAR(50) + `apellido` VARCHAR(50)
 *   - Validación: campos `validado` BOOLEAN + `validado_en` DATETIME (agregados por migración)
 * 
 * Endpoints:
 *   GET  /api/validacion/buscar?dni=XXXXXXXX  — Buscar inscripto por DNI
 *   PATCH /api/validacion/validar              — Marcar inscripto como validado
 */

import { Router } from "express";
import { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "../database/database";
import logger, { logDB, logError } from "../utils/logger";

const router = Router();

const DEFAULT_VALIDATION_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_VALIDATION_USERNAME = "sistema_validacion";

function normalizeDni(value: unknown): string {
    return String(value || "").replace(/\D+/g, "").trim();
}

async function resolveValidationUser(connection: PoolConnection): Promise<string> {
    const configuredUserId = String(process.env.VALIDACION_USUARIO_ID || "").trim();

    if (configuredUserId) {
        const [configuredRows] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
            [configuredUserId]
        );

        if (configuredRows.length > 0) {
            return String(configuredRows[0].id);
        }
    }

    const [existingRows] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM usuarios ORDER BY nom_usuario ASC LIMIT 1"
    );

    if (existingRows.length > 0) {
        return String(existingRows[0].id);
    }

    await connection.query(
        `INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt)
         SELECT ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
             SELECT 1 FROM usuarios WHERE id = ? OR nom_usuario = ?
         )`,
        [
            DEFAULT_VALIDATION_USER_ID,
            "Sistema",
            "Validación",
            DEFAULT_VALIDATION_USERNAME,
            "NO_LOGIN",
            "SYSTEM_VALIDATION_SALT",
            DEFAULT_VALIDATION_USER_ID,
            DEFAULT_VALIDATION_USERNAME,
        ]
    );

    const [systemRows] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM usuarios WHERE id = ? OR nom_usuario = ? LIMIT 1",
        [DEFAULT_VALIDATION_USER_ID, DEFAULT_VALIDATION_USERNAME]
    );

    if (systemRows.length === 0) {
        throw new Error("No se pudo resolver el usuario habilitante para registrar el ingreso");
    }

    return String(systemRows[0].id);
}

// GET /buscar?dni=XXXXXXXX — Buscar inscripto por DNI
router.get("/buscar", async (req, res) => {
    try {
        const dni = normalizeDni(req.query.dni);

        if (!dni) {
            return res.status(400).json({
                encontrado: false,
                error: "El parámetro DNI es obligatorio"
            });
        }

        logger.info(`[Validación] Búsqueda de inscripto por DNI: ${dni}`);

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT i.id, i.nombre, i.apellido,
                    MAX(ii.fecha_ingreso) AS fecha_ingreso
             FROM inscriptos i
             LEFT JOIN inscriptos_ingresos ii ON ii.inscriptos_id = i.id
             WHERE i.dni = ?
             GROUP BY i.id, i.nombre, i.apellido
             LIMIT 1`,
            [dni]
        );

        if (rows.length === 0) {
            logger.info(`[Validación] DNI no encontrado: ${dni}`);
            return res.status(404).json({
                encontrado: false,
                error: "No se encontró ningún inscripto con ese DNI"
            });
        }

        const inscripto = rows[0];
        const validadoEn = inscripto.fecha_ingreso || null;
        const validado = Boolean(inscripto.fecha_ingreso);
        logDB(`[Validación] Inscripto encontrado: ${inscripto.nombre} ${inscripto.apellido}`);

        res.json({
            encontrado: true,
            id: String(inscripto.id),
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado,
            validado_en: validadoEn
        });

    } catch (error: any) {
        logError("[Validación] Error al buscar inscripto", error);
        res.status(500).json({
            encontrado: false,
            error: "Error interno al buscar el inscripto"
        });
    }
});

// PATCH /validar — Marcar inscripto como validado
router.patch("/validar", async (req, res) => {
    let connection: PoolConnection | undefined;
    try {
        const dni = normalizeDni(req.body.dni);

        if (!dni) {
            return res.status(400).json({
                ok: false,
                error: "El campo DNI es obligatorio"
            });
        }

        logger.info(`[Validación] Intento de validar inscripto con DNI: ${dni}`);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.query<RowDataPacket[]>(
            "SELECT id, nombre, apellido FROM inscriptos WHERE dni = ? LIMIT 1 FOR UPDATE",
            [dni]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                ok: false,
                error: "No se encontró ningún inscripto con ese DNI"
            });
        }

        const inscripto = rows[0];
        const [ingresoRows] = await connection.query<RowDataPacket[]>(
            "SELECT MAX(fecha_ingreso) AS fecha_ingreso FROM inscriptos_ingresos WHERE inscriptos_id = ?",
            [inscripto.id]
        );
        const fechaIngreso = ingresoRows[0]?.fecha_ingreso || null;
        const validadoEn = fechaIngreso || null;
        const yaValidado = Boolean(fechaIngreso);

        if (yaValidado) {
            await connection.commit();
            logger.info(`[Validación] Inscripto ya validado previamente: ${inscripto.nombre} ${inscripto.apellido}`);
            return res.json({
                ok: true,
                nombre: inscripto.nombre,
                apellido: inscripto.apellido,
                validado_en: validadoEn,
                ya_validado: true
            });
        }

        const usuarioHabilitante = await resolveValidationUser(connection);
        const ahora = new Date();
        await connection.query(
            "INSERT INTO inscriptos_ingresos (inscriptos_id, fecha_ingreso, usuario_habilitante) VALUES (?, ?, ?)",
            [inscripto.id, ahora, usuarioHabilitante]
        );

        await connection.commit();

        logDB(`[Validación] Inscripto validado: ${inscripto.nombre} ${inscripto.apellido} (DNI: ${dni})`);

        res.json({
            ok: true,
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado_en: ahora.toISOString()
        });

    } catch (error: any) {
        if (connection) {
            try {
                await connection.rollback();
            } catch {
            }
        }
        logError("[Validación] Error al validar inscripto", error);
        res.status(500).json({
            ok: false,
            error: "Error interno al validar el inscripto"
        });
    } finally {
        connection?.release();
    }
});

export default router;
