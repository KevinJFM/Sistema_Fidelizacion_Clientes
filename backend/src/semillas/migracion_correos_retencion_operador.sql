-- ============================================================
--  Migración: correos de retención del OPERADOR turístico
--  1) Tabla `alertas_enviadas_operador` (rastrea los envíos para no repetir,
--     paralela a `alertas_enviadas` de clientes).
--  2) Dos plantillas de correo automáticas (sin botón: el operador no entra al portal):
--       - cerca_canje_operador: "¡casi llegas!" al 80% de su próxima recompensa (diario).
--       - resumen_operador: resumen MENSUAL con su saldo y lo que ya puede canjear.
--
--  Solo para la BD LOCAL. El esquema en limpio (bd_fidelizacion.sql) ya trae todo,
--  así que en producción se crea al desplegar.
--  Idempotente: la tabla usa IF NOT EXISTS y las plantillas conservan su contenido
--  actual si ya existen (por si el admin ya las editó desde el panel).
-- ============================================================

CREATE TABLE IF NOT EXISTS alertas_enviadas_operador (
  id            INT          NOT NULL AUTO_INCREMENT,
  id_operador   INT          NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,       -- 'cerca_canje' | 'resumen'
  referencia    VARCHAR(100) NULL,           -- id_recompensa para cerca_canje; período YYYY-MM para resumen
  fecha_enviada DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_alertas_op_operador FOREIGN KEY (id_operador) REFERENCES operadores_turisticos(id_operador) ON DELETE CASCADE,
  INDEX idx_operador_tipo (id_operador, tipo, referencia)
);

INSERT INTO plantillas_correo (clave, nombre, descripcion, obligatorio, activo, asunto, titulo, intro, cuerpo, boton, variables) VALUES
  ('cerca_canje_operador', 'Casi llegas (operador)', 'Automático: cuando el operador alcanza el 80% de su próxima recompensa.', 0, 1,
   '¡Casi llegas a "{recompensa}"! · Punta Diamantes', '¡Casi llegas, {nombre}!', 'Solo te faltan {faltan} puntos para tu próximo canje.',
   'En tu próxima visita con tu grupo puedes completar tus puntos y reclamar {recompensa} en recepción.', NULL,
   '{nombre}, {puntos}, {recompensa}, {recompensaPuntos}, {faltan}, {porcentaje}'),
  ('resumen_operador', 'Resumen mensual (operador)', 'Automático: cada mes, el saldo del operador y las recompensas que ya puede canjear (no entra al portal).', 0, 1,
   'Tus puntos este mes · Punta Diamantes', 'Tus puntos, {nombre}', 'Este es tu saldo y lo que ya puedes canjear en recepción.',
   'Recuerda que en cada visita con tu grupo ganas puntos. ¡Te esperamos pronto en Punta Diamantes!', NULL,
   '{nombre}, {puntos}')
ON DUPLICATE KEY UPDATE clave = clave;
