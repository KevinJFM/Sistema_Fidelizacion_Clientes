-- ============================================================
--  MIGRACIÓN: roles admin / recepcionista / empleado
--  Renombra "cajero" a "recepcionista" (conserva su id y usuarios)
--  y agrega el rol "empleado". Ejecuta este archivo UNA vez.
-- ============================================================
USE db_fidelizacion;

-- Renombra el rol operativo: cajero -> recepcionista
UPDATE roles
   SET rol = 'recepcionista',
       descripcion = 'Front desk: registra huéspedes, consumos y consultas'
 WHERE rol = 'cajero';

-- Agrega el rol empleado (si ya existe, no lo toca)
INSERT IGNORE INTO roles (rol, descripcion) VALUES
  ('empleado', 'Consulta de puntos de los huéspedes');

-- Elimina cualquier rol "cliente" que no debería existir (sin usuarios asignados)
DELETE FROM roles WHERE rol = 'cliente';
