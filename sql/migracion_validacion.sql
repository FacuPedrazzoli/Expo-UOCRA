-- Migración: Agregar campos de validación a la tabla inscriptos
-- Ejecutar esta migración antes de usar la sección /admin-validacion
--
-- Campos agregados:
--   validado: BOOLEAN DEFAULT FALSE — indica si el inscripto fue validado
--   validado_en: DATETIME NULL — timestamp de cuándo fue validado
--
-- Nota: El campo DNI ya tiene UNIQUE constraint (que actúa como índice)
--       por lo que no es necesario crear un índice adicional.

ALTER TABLE inscriptos
    ADD COLUMN validado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN validado_en DATETIME NULL DEFAULT NULL;
