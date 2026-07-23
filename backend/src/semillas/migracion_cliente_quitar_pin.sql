-- ============================================================
--  Migración: eliminar el campo pin_hash de la tabla clientes
--  Ya no se usa: el acceso del cliente al portal/app es por CÓDIGO
--  (OTP) enviado al correo, no por PIN.
--
--  Aplicar sobre una base ya existente (que aún tenga la columna).
--  En instalaciones nuevas no hace falta: bd_fidelizacion.sql ya no crea pin_hash.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE clientes DROP COLUMN pin_hash;
