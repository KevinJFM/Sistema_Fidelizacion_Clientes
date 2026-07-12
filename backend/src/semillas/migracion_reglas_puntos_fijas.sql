-- ============================================================
--  MIGRACIÓN: reglas de puntos fijas por código
--  - Cliente: ganar $1 = 1 punto; cada punto vale $0.05 (canje derivado).
--  - Operador: 100 puntos por visita.
--  Estas reglas ya no viven en la tabla configuracion.
--  Ejecuta este archivo UNA vez sobre la BD existente.
-- ============================================================
USE db_fidelizacion;

DELETE FROM configuracion WHERE clave IN (
  'valor_canje',            -- ahora se deriva del valor fijo del punto ($0.05)
  'puntos_para_canje',      -- el catálogo de recompensas (fijo) define los puntos
  'canje_activo',           -- el canje siempre está activo (no configurable)
  'operador_puntos_persona',
  'operador_min_personas',
  'operador_valor_punto'
);
