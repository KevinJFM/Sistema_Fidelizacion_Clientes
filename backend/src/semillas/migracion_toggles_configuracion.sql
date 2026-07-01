-- ============================================================
--  MIGRACIÓN: interruptores ON/OFF para las reglas de Configuración
--  Ejecuta este archivo UNA vez sobre la BD existente (no borra nada).
--  INSERT IGNORE: si la clave ya existe, la deja como está.
-- ============================================================
USE db_fidelizacion;

INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('canje_activo',           '1', 'Permite canjear puntos por descuento'),
  ('bienvenida_activo',      '1', 'Activa el beneficio de bienvenida (primera compra)'),
  ('descuento_monto_activo', '1', 'Activa el descuento por compra alta');
