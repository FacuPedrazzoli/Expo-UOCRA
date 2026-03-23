import { Router } from 'express';
import pool from '../database/database';
import logger from '../utils/logger';

const router = Router();

router.get('/', async (_req, res) => {
    try {
        const [resumenResult, porDiaResult, porCharlaResult, comoResult, validacionResult] = await Promise.all([
            pool.query(`
                SELECT 
                    COUNT(*) AS total_inscriptos,
                    COUNT(CASE WHEN fecha_registro >= NOW() - INTERVAL '7 days' THEN 1 END) AS inscriptos_ultima_semana
                FROM inscriptos
            `),
            pool.query(`
                SELECT 
                    DATE(fecha_registro) AS fecha,
                    COUNT(*) AS cantidad
                FROM inscriptos
                WHERE fecha_registro >= NOW() - INTERVAL '14 days'
                GROUP BY DATE(fecha_registro)
                ORDER BY fecha ASC
            `),
            pool.query(`
                SELECT 
                    c.titulo,
                    c.horario,
                    c.ubicacion,
                    COUNT(ic.inscriptos_id) AS total_inscriptos,
                    50 AS capacidad_maxima
                FROM charlas c
                LEFT JOIN inscriptos_charlas ic ON c.id = ic.charlas_id
                GROUP BY c.id, c.titulo, c.horario, c.ubicacion
                ORDER BY total_inscriptos DESC
            `),
            pool.query(`
                SELECT 
                    cte.descripcion,
                    COUNT(i.id) AS cantidad
                FROM como_te_enteraste cte
                LEFT JOIN inscriptos i ON cte.id = i.como_te_enteraste_fk
                GROUP BY cte.id, cte.descripcion
                ORDER BY cantidad DESC
            `),
            pool.query(`
                SELECT 
                    COUNT(*) AS total,
                    COUNT(ii.inscriptos_id) AS validados,
                    COUNT(*) - COUNT(ii.inscriptos_id) AS pendientes
                FROM inscriptos i
                LEFT JOIN (
                    SELECT DISTINCT inscriptos_id FROM inscriptos_ingresos
                ) ii ON i.id = ii.inscriptos_id
            `)
        ]);

        const resumen = {
            total_inscriptos: parseInt(resumenResult.rows[0]?.total_inscriptos) || 0,
            inscriptos_ultima_semana: parseInt(resumenResult.rows[0]?.inscriptos_ultima_semana) || 0,
            validados: parseInt(validacionResult.rows[0]?.validados) || 0,
            pendientes: parseInt(validacionResult.rows[0]?.pendientes) || 0
        };

        const por_dia = porDiaResult.rows.map(row => ({
            fecha: row.fecha instanceof Date ? row.fecha.toISOString().split('T')[0] : String(row.fecha),
            cantidad: parseInt(row.cantidad) || 0
        }));

        const por_charla = porCharlaResult.rows.map(row => ({
            titulo: row.titulo || 'Sin título',
            horario: row.horario || 'Sin horario',
            ubicacion: row.ubicacion || 'Sin ubicación',
            total_inscriptos: parseInt(row.total_inscriptos) || 0,
            capacidad_maxima: parseInt(row.capacidad_maxima) || 50
        }));

        const como_se_enteraron = comoResult.rows.map(row => ({
            descripcion: row.descripcion || 'Sin descripción',
            cantidad: parseInt(row.cantidad) || 0
        }));

        logger.debug('[Stats] Datos obtenidos correctamente');

        res.json({
            resumen,
            por_dia,
            por_charla,
            como_se_enteraron
        });

    } catch (error: any) {
        logger.error('[Stats] Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

export default router;