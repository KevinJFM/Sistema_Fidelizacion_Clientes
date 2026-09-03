-- ============================================================
--  Migración: correos al OPERADOR turístico
--  Agrega dos plantillas de correo (bienvenida + comprobante) para
--  los operadores turísticos, iguales a las del cliente pero SIN botón
--  (el operador no entra al portal). El comprobante sirve tanto para
--  visitas como para canjes.
--
--  Solo para la BD LOCAL. El esquema en limpio (bd_fidelizacion.sql)
--  ya trae estas filas, así que en producción se crean al desplegar.
--  Idempotente: si las claves ya existen, conserva su contenido actual
--  (por si el admin ya las editó desde el panel).
-- ============================================================

INSERT INTO plantillas_correo (clave, nombre, descripcion, obligatorio, activo, asunto, titulo, intro, cuerpo, boton, variables) VALUES
  ('bienvenida_operador', 'Bienvenida (operador nuevo)', 'Se envía cuando registras un operador turístico nuevo que tiene correo.', 0, 1,
   '¡Bienvenido al programa de puntos! · Punta Diamantes', '¡Bienvenido, {nombre}!', 'Ya eres parte del programa de puntos para operadores turísticos de Punta Diamantes.',
   'Por cada visita con tu grupo al hotel acumulas puntos que puedes canjear por recompensas en recepción. ¡Nos vemos pronto!', NULL,
   '{nombre}'),
  ('comprobante_operador', 'Comprobante de operador', 'Se envía al operador al registrar una visita o un canje (si tiene correo).', 0, 1,
   'Tu comprobante · Punta Diamantes', '¡Gracias, {nombre}!', 'Este es el detalle de tu registro y tus puntos.',
   'Tu saldo actual es de {saldo} puntos. ¡Gracias por traer a tu grupo a Punta Diamantes!', NULL,
   '{nombre}, {personas}, {puntosGanados}, {puntosCanjeados}, {recompensa}, {saldo}, {minimo}')
ON DUPLICATE KEY UPDATE clave = clave;
