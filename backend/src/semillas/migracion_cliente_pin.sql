-- ============================================================
--  Migración: PIN del portal del cliente (Fase 2)
--  Agrega la columna donde se guarda el hash del PIN con el que
--  el cliente entra al portal de autoservicio a consultar sus puntos.
--  El PIN se guarda con bcrypt (nunca en texto plano).
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN pin_hash VARCHAR(255) NULL AFTER puntos_acumulados;
