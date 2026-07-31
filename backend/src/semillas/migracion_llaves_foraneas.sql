-- ============================================================
--  Migración: llaves foráneas faltantes (tablas que quedaban "sueltas")
--  Enlaza tres tablas al resto del modelo:
--    - recompensas.creado_por        -> usuarios  (ON DELETE SET NULL)
--    - configuracion.actualizado_por -> usuarios  (ON DELETE SET NULL)
--    - alertas_enviadas.id_cliente   -> clientes  (ON DELETE CASCADE)
--
--  SOLO para actualizar una base LOCAL que ya existe.
--  En el deploy EN LIMPIO las FKs ya vienen en el esquema:
--    - recompensas.creado_por      -> lo trae bd_fidelizacion.sql (main)
--    - configuracion / alertas_enviadas -> lo trae feature/tesis-config
--  (Se juntan aquí en una sola migración para no tener que rebuildar
--   tu base local; el esquema de cada tabla vive en su rama, así no
--   hay conflictos al unir cambios.)
--
--  CÓMO CORRERLO
--  En MySQL Workbench: abre este archivo sobre la base db_fidelizacion
--  y ejecútalo UNA sola vez.
-- ============================================================
USE db_fidelizacion;

-- ------------------------------------------------------------
-- 1) recompensas.creado_por -> usuarios
--    Nueva columna de auditoría (quién creó la recompensa).
--    Nullable + ON DELETE SET NULL: si se borra el usuario, la
--    recompensa se conserva con creado_por = NULL.
-- ------------------------------------------------------------
ALTER TABLE recompensas
  ADD COLUMN creado_por INT NULL AFTER creado_en;

ALTER TABLE recompensas
  ADD CONSTRAINT fk_recompensas_usuario
  FOREIGN KEY (creado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 2) configuracion.actualizado_por -> usuarios
--    Nueva columna de auditoría (quién cambió el último valor).
-- ------------------------------------------------------------
ALTER TABLE configuracion
  ADD COLUMN actualizado_por INT NULL AFTER descripcion;

ALTER TABLE configuracion
  ADD CONSTRAINT fk_config_usuario
  FOREIGN KEY (actualizado_por) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 3) alertas_enviadas.id_cliente -> clientes
--    La columna ya existe (solo tenía índice, no FK).
--    Antes de crear la FK, se limpian alertas huérfanas (de
--    clientes ya borrados) para que el ALTER no falle.
-- ------------------------------------------------------------
DELETE a FROM alertas_enviadas a
  LEFT JOIN clientes c ON c.id_cliente = a.id_cliente
  WHERE c.id_cliente IS NULL;

ALTER TABLE alertas_enviadas
  ADD CONSTRAINT fk_alertas_cliente
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE;
