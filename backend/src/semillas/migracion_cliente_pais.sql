-- ============================================================
--  Migración: país del cliente (para huéspedes extranjeros)
--  Nueva columna `pais` en clientes. Guarda el país del cliente y, a la vez,
--  define el código de marcación del teléfono (+503, +1, +34, ...).
--  Los clientes existentes quedan como 'El Salvador' por defecto.
--
--  Solo para la BD LOCAL. El esquema en limpio (bd_fidelizacion.sql) ya trae
--  esta columna, así que en producción se crea al desplegar.
-- ============================================================

ALTER TABLE clientes
  ADD COLUMN pais VARCHAR(60) NOT NULL DEFAULT 'El Salvador' AFTER telefono;
