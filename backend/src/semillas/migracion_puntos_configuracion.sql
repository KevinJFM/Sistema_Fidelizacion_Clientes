-- ============================================================
--  MIGRACIÓN: puntos por monto configurable
--  Cambia "puntos por cada $1" por un par flexible:
--  "por cada $X de compra el cliente gana Y puntos".
--  Ejecuta este archivo UNA vez sobre la BD existente.
-- ============================================================
USE db_fidelizacion;

-- Agrega las dos claves nuevas (si ya existen, no las toca)
INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('puntos_monto_base', '1', 'Monto en $ de compra que se toma como base para otorgar puntos'),
  ('puntos_por_monto',  '1', 'Puntos que gana el cliente por cada monto base');

-- Si tenías configurado puntos_por_dolar, conserva su valor como "puntos por cada $1"
UPDATE configuracion
   SET valor = (SELECT valor FROM (SELECT valor FROM configuracion WHERE clave = 'puntos_por_dolar') AS tmp)
 WHERE clave = 'puntos_por_monto'
   AND EXISTS (SELECT 1 FROM (SELECT 1 FROM configuracion WHERE clave = 'puntos_por_dolar') AS t);

-- Elimina la clave antigua (ya no se usa)
DELETE FROM configuracion WHERE clave = 'puntos_por_dolar';
