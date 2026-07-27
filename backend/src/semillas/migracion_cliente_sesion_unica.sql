-- ============================================================
--  Sesión única por superficie: columnas sesion_app / sesion_portal
--  en la tabla clientes. Guardan el id de la sesión ACTIVA de cada
--  superficie (app / portal). Al iniciar sesión en la misma superficie
--  se genera un id nuevo y el anterior deja de valer.
--
--  Solo para BD ya existentes (las nuevas ya lo traen en bd_fidelizacion.sql).
--
--  CÓMO CORRERLO
--  En MySQL Workbench: abre este archivo sobre la base db_fidelizacion
--  y ejecútalo una sola vez.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE clientes
  ADD COLUMN sesion_app    VARCHAR(64) NULL AFTER push_token,
  ADD COLUMN sesion_portal VARCHAR(64) NULL AFTER sesion_app;
