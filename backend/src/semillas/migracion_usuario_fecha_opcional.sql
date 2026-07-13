-- ============================================================
--  MIGRACIÓN: fecha de nacimiento opcional en usuarios
--  Permite guardar usuarios sin fecha de nacimiento (NULL).
--  Ejecuta este archivo UNA vez sobre la BD existente.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE usuarios
  MODIFY fecha_nacimiento DATE NULL;
