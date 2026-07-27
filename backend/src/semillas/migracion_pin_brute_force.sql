-- ============================================================
--  Migración: protección contra fuerza bruta en el PIN del portal.
--  Agrega dos columnas a `clientes`:
--   - pin_intentos:       contador de intentos fallidos consecutivos.
--   - pin_bloqueado_hasta: si está en el futuro, el PIN está bloqueado.
--  Tras 5 intentos fallidos el sistema bloquea el PIN durante 15 minutos.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS pin_intentos       TINYINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_bloqueado_hasta DATETIME NULL;
