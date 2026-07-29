-- ============================================================
--  bitacora.id_usuario -> ON DELETE SET NULL
--  Blinda el borrado físico de usuarios: si se elimina un usuario
--  (incluso por SQL directo, sin desligar la bitácora antes), sus
--  registros de auditoría se conservan con id_usuario = NULL.
--  Las BD nuevas ya lo traen en el esquema.
--
--  CÓMO CORRERLO
--  En MySQL Workbench: abre este archivo sobre la base db_fidelizacion
--  y ejecútalo una sola vez.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE bitacora DROP FOREIGN KEY fk_bitacora_usuario;
ALTER TABLE bitacora
  ADD CONSTRAINT fk_bitacora_usuario
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
