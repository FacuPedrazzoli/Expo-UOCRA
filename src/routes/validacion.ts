import { Router } from "express";
import { PoolClient } from "pg";
import pool, { getClient } from "../database/database";
import logger from "../utils/logger";

const router = Router();

const DEFAULT_VALIDATION_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_VALIDATION_USERNAME = "sistema_validacion";

function normalizeDni(value: unknown): string {
    return String(value || "").replace(/\D+/g, "").trim();
}

async function dbQuery(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('[DB] Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
}

async function resolveValidationUser(client: PoolClient): Promise<string> {
    const configuredUserId = String(process.env.VALIDACION_USUARIO_ID || "").trim();

    if (configuredUserId) {
        const configuredRows = await client.query(
            "SELECT id FROM usuarios WHERE id = $1 LIMIT 1",
            [configuredUserId]
        );

        if (configuredRows.rowCount && configuredRows.rowCount > 0) {
            return String(configuredRows.rows[0].id);
        }
    }

    const existingRows = await client.query(
        "SELECT id FROM usuarios ORDER BY nom_usuario ASC LIMIT 1"
    );

    if (existingRows.rowCount && existingRows.rowCount > 0) {
        return String(existingRows.rows[0].id);
    }

    await client.query(
        `INSERT INTO usuarios (id, nombre, apellido, nom_usuario, password, salt)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [
            DEFAULT_VALIDATION_USER_ID,
            "Sistema",
            "Validación",
            DEFAULT_VALIDATION_USERNAME,
            "NO_LOGIN",
            "SYSTEM_VALIDATION_SALT",
        ]
    );

    const systemRows = await client.query(
        "SELECT id FROM usuarios WHERE id = $1 OR nom_usuario = $2 LIMIT 1",
        [DEFAULT_VALIDATION_USER_ID, DEFAULT_VALIDATION_USERNAME]
    );

    if (!systemRows.rowCount || systemRows.rowCount === 0) {
        throw new Error("No se pudo resolver el usuario habilitante para registrar el ingreso");
    }

    return String(systemRows.rows[0].id);
}

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

        const rows = await dbQuery(`
            SELECT i.id, i.nombre, i.apellido,
                    MAX(ii.fecha_ingreso) AS fecha_ingreso
            FROM inscriptos i
            LEFT JOIN inscriptos_ingresos ii ON ii.inscriptos_id = i.id
            WHERE i.dni = $1
            GROUP BY i.id, i.nombre, i.apellido
            LIMIT 1
        `, [dni]);

        if (!rows.rowCount || rows.rowCount === 0) {
            logger.info(`[Validación] DNI no encontrado: ${dni}`);
            return res.status(404).json({
                encontrado: false,
                error: "No se encontró ningún inscripto con ese DNI"
            });
        }

        const inscripto = rows.rows[0];
        const validadoEn = inscripto.fecha_ingreso || null;
        const validado = Boolean(inscripto.fecha_ingreso);
        logger.debug(`[DB] [Validación] Inscripto encontrado: ${inscripto.nombre} ${inscripto.apellido}`);

        res.json({
            encontrado: true,
            id: String(inscripto.id),
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado,
            validado_en: validadoEn
        });

    } catch (error: any) {
        logger.error("[Validación] Error al buscar inscripto", error);
        res.status(500).json({
            encontrado: false,
            error: "Error interno al buscar el inscripto"
        });
    }
});

router.patch("/validar", async (req, res) => {
    let client: PoolClient | undefined;
    try {
        const dni = normalizeDni(req.body.dni);

        if (!dni) {
            return res.status(400).json({
                ok: false,
                error: "El campo DNI es obligatorio"
            });
        }

        logger.info(`[Validación] Intento de validar inscripto con DNI: ${dni}`);

        client = await getClient();
        await client.query('BEGIN');

        const rows = await client.query(
            "SELECT id, nombre, apellido FROM inscriptos WHERE dni = $1 LIMIT 1",
            [dni]
        );

        if (!rows.rowCount || rows.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                ok: false,
                error: "No se encontró ningún inscripto con ese DNI"
            });
        }

        const inscripto = rows.rows[0];
        
        const ingresoRows = await client.query(
            "SELECT MAX(fecha_ingreso) AS fecha_ingreso FROM inscriptos_ingresos WHERE inscriptos_id = $1",
            [inscripto.id]
        );
        
        const fechaIngreso = ingresoRows.rows[0]?.fecha_ingreso || null;
        const validadoEn = fechaIngreso || null;
        const yaValidado = Boolean(fechaIngreso);

        if (yaValidado) {
            await client.query('COMMIT');
            logger.info(`[Validación] Inscripto ya validado previamente: ${inscripto.nombre} ${inscripto.apellido}`);
            return res.json({
                ok: true,
                nombre: inscripto.nombre,
                apellido: inscripto.apellido,
                validado_en: validadoEn,
                ya_validado: true
            });
        }

        const usuarioHabilitante = await resolveValidationUser(client);
        const ahora = new Date();
        
        await client.query(
            "INSERT INTO inscriptos_ingresos (inscriptos_id, fecha_ingreso, usuario_habilitante) VALUES ($1, $2, $3)",
            [inscripto.id, ahora, usuarioHabilitante]
        );

        await client.query('COMMIT');

        logger.debug(`[Validación] Inscripto validado: ${inscripto.nombre} ${inscripto.apellido} (DNI: ${dni})`);

        res.json({
            ok: true,
            nombre: inscripto.nombre,
            apellido: inscripto.apellido,
            validado_en: ahora.toISOString()
        });

    } catch (error: any) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch {
            }
        }
        logger.error("[Validación] Error al validar inscripto", error);
        res.status(500).json({
            ok: false,
            error: "Error interno al validar el inscripto"
        });
    } finally {
        client?.release();
    }
});

export default router;
