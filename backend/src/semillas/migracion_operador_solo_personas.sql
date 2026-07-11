-- ============================================================
--  MIGRACIÓN: el Tour Operador solo gana puntos por persona
--  Elimina de transacciones_operador los montos y puntos de
--  habitaciones/consumo, que ya no se usan.
--  Ejecuta este archivo UNA vez sobre la BD existente.
-- ============================================================
USE db_fidelizacion;

ALTER TABLE transacciones_operador
  DROP COLUMN monto_habitaciones,
  DROP COLUMN monto_consumo,
  DROP COLUMN puntos_consumo;

-- Quita también la regla que ya no aplica (por si existe)
DELETE FROM configuracion WHERE clave = 'operador_tasa_hab_consumo';
