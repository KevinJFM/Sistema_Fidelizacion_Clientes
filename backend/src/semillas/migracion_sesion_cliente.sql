-- Migración: columnas de sesión única por superficie en la tabla clientes
-- Requeridas por el portal del cliente (login OTP).
-- Ejecutar una sola vez en la BD de producción.
USE db_fidelizacion;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS sesion_app     VARCHAR(48) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sesion_portal  VARCHAR(48) NULL DEFAULT NULL;
