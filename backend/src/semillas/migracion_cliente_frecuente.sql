-- ============================================================
--  Migración: regla "Cliente frecuente" (configurable)
--  Un cliente se considera frecuente cuando registra al menos N
--  transacciones (no anuladas) en los últimos M meses.
--  Interruptor activo/inactivo, editable desde Configuración.
--
--  Solo para la BD LOCAL. El esquema en limpio (bd_fidelizacion.sql)
--  ya trae estas filas, así que en producción se crean al desplegar.
--  Idempotente: si las claves ya existen, conserva el valor actual.
-- ============================================================

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('frecuente_activo',            '1', 'Activa la etiqueta de cliente frecuente'),
  ('frecuente_min_transacciones', '5', 'Transacciones mínimas para considerar frecuente a un cliente'),
  ('frecuente_periodo_meses',     '6', 'Ventana en meses para contar las transacciones del cliente frecuente')
ON DUPLICATE KEY UPDATE valor = valor;
