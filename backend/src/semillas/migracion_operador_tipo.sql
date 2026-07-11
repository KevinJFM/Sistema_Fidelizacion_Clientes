-- ============================================================
--  MIGRACIÓN: tipo de Tour Operador (Persona natural / Empresa)
--  Agrega la columna "tipo" a operadores_turisticos.
--  Ejecuta este archivo UNA vez sobre la BD existente.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE operadores_turisticos
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'Persona natural' AFTER nombre;
