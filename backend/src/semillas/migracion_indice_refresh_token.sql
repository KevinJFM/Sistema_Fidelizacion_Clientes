-- ============================================================
--  Índice en refresh_tokens.token_hash (búsquedas del refresh).
--  Necesario en BD ya existentes (la tabla se creó sin este índice).
--  Las BD nuevas ya lo traen en el esquema.
--
--  CÓMO CORRERLO
--  En MySQL Workbench: abre este archivo sobre la base db_fidelizacion
--  y ejecútalo una sola vez.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE refresh_tokens ADD INDEX idx_rt_token (token_hash);
