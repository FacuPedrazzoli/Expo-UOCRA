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
import { RowDataPacket } from "mysql2/promise";
import pool from "../database/database";
import logger, { logDB, logError } from "../utils/logger";

const router = Router();

// GET /buscar?dni=XXXXXXXX — Buscar inscripto por DNI
router.get("/buscar", async (req, res) => {
    try {
        const dni = String(req.query.dni || "").trim();

        if (!dni) {
            return res.status(400).json({
                encontrado: false,
                error: "El parámetro DNI es obligatorio"
            });
        }

        logger.info(`[Validación] Búsqueda de inscripto por DNI: ${dni}`);

        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT nombre, apellido, validado, validado_en FROM inscriptos WHERE dni = ? LIMIT 1",
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
        logDB(`[Validación] Inscripto encontrado: ${inscripto.nombre} ${inscripto.apellido}`);

        res.json({
            encontrado: true,
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado: Boolean(inscripto.validado),
            validado_en: inscripto.validado_en || null
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
    try {
        const dni = String(req.body.dni || "").trim();

        if (!dni) {
            return res.status(400).json({
                ok: false,
                error: "El campo DNI es obligatorio"
            });
        }

        logger.info(`[Validación] Intento de validar inscripto con DNI: ${dni}`);

        // Verificar que el inscripto existe y obtener estado actual
        const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT nombre, apellido, validado FROM inscriptos WHERE dni = ? LIMIT 1",
            [dni]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: "No se encontró ningún inscripto con ese DNI"
            });
        }

        const inscripto = rows[0];

        // Si ya está validado, retornar sin modificar
        if (inscripto.validado) {
            logger.info(`[Validación] Inscripto ya validado previamente: ${inscripto.nombre} ${inscripto.apellido}`);
            return res.json({
                ok: true,
                nombre: inscripto.nombre,
                apellido: inscripto.apellido,
                validado_en: null,
                ya_validado: true
            });
        }

        // Marcar como validado
        const ahora = new Date();
        await pool.query(
            "UPDATE inscriptos SET validado = TRUE, validado_en = ? WHERE dni = ?",
            [ahora, dni]
        );

        logDB(`[Validación] Inscripto validado: ${inscripto.nombre} ${inscripto.apellido} (DNI: ${dni})`);

        res.json({
            ok: true,
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado_en: ahora.toISOString()
        });

    } catch (error: any) {
        logError("[Validación] Error al validar inscripto", error);
        res.status(500).json({
            ok: false,
            error: "Error interno al validar el inscripto"
        });
    }
});

export default router;
