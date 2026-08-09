-- ============================================================
--  MIGRACIÓN — Perfiles de conexión Local/Web para el POS
--  Correr UNA sola vez en cada BD que YA tenga la tabla pos_configuracion
--  (tu BD local y la del hosting). Para instalaciones nuevas NO hace falta:
--  ya viene en el esquema (01_ddl + 02_dml / db_fidelizacion_merasopa.sql).
--
--  Ajusta el nombre de la base en la línea USE si tu BD se llama distinto.
-- ============================================================
USE db_fidelizacion_merasopa;

-- 1) Nuevas columnas: perfil ('local'/'web') y activo (1 = el que usa la sincronización)
ALTER TABLE pos_configuracion
  ADD COLUMN perfil VARCHAR(10) NOT NULL DEFAULT 'local' AFTER id,
  ADD COLUMN activo TINYINT(1)  NOT NULL DEFAULT 0        AFTER modo;

-- 2) La configuración que ya tenías se vuelve el perfil 'local' y queda ACTIVO
--    (parte del supuesto normal: una sola fila de configuración).
UPDATE pos_configuracion SET perfil = 'local', activo = 1 ORDER BY id LIMIT 1;

-- 3) Crea el perfil 'web' (vacío por defecto; luego lo llenas desde el panel)
INSERT INTO pos_configuracion (perfil, servidor, puerto, usuario, contrasena, base_datos, modo, activo)
VALUES ('web', 'localhost', 3306, 'root', '', 'eorderback', 'manual', 0);

-- 4) Evita que a futuro se dupliquen perfiles (un solo 'local' y un solo 'web')
ALTER TABLE pos_configuracion ADD UNIQUE KEY uq_pos_perfil (perfil);
