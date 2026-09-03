-- ============================================================
--  Migración: país del OPERADOR turístico
--  Nueva columna `pais` en operadores_turisticos. Guarda el país del operador y,
--  a la vez, define el código de marcación del teléfono (+503, +1, +34, ...),
--  igual que en clientes. Los operadores existentes quedan como 'El Salvador'.
--
--  Solo para la BD LOCAL. El esquema en limpio (bd_fidelizacion.sql) ya trae
--  esta columna, así que en producción se crea al desplegar.
-- ============================================================

ALTER TABLE operadores_turisticos
  ADD COLUMN pais VARCHAR(60) NOT NULL DEFAULT 'El Salvador' AFTER telefono;
