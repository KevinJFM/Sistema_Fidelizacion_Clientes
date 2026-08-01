-- Agregar clientes + pagos a `eorderback` (manual, para probar Integración POS): RESET en las dos bases, crear clientes y registrar un pago por cada uno.
-- Correr por partes en MySQL Workbench (crear cliente → Sincronizar → pago → sincronizar → revisar historial). Documento: idDocumento 2 = DUI, 4 = Pasaporte; sin ellos no se crea.

-- ============================================================
--  PARTE 1 — RESET (empezar de cero). SE BORRA EN LAS DOS BASES.
--  Importante: si NO borras el rastreo de nuestra base, al sincronizar de
--  nuevo los clientes NO vuelven a entrar (ya están marcados como procesados).
-- ============================================================

-- 1a) En el POS (eorderback): pagos -> pedidos -> clientes (por las llaves foráneas).
USE eorderback;
DELETE FROM pago_combinado WHERE idPedido  BETWEEN 500 AND 505;
DELETE FROM pedido         WHERE idPedido  BETWEEN 500 AND 505;
DELETE FROM cliente        WHERE idCliente BETWEEN 500 AND 505;

-- 1b) En NUESTRA base (db_fidelizacion_merasopa): rastreo + puntos + transacciones + clientes.
--     Orden correcto por las llaves foráneas: primero movimientos y transacciones, luego el cliente.
USE db_fidelizacion_merasopa;
DELETE FROM pos_pedido_procesado  WHERE id_pedido_pos  BETWEEN 500 AND 505;
DELETE FROM pos_cliente_procesado WHERE id_cliente_pos BETWEEN 500 AND 505;
DELETE mp FROM movimientos_puntos mp
  JOIN clientes c ON mp.id_cliente = c.id_cliente
 WHERE c.numero_documento IN ('20304050-6','21314151-7','F7778888','22324252-8','23334353-9');
DELETE t FROM transacciones t
  JOIN clientes c ON t.id_cliente = c.id_cliente
 WHERE c.numero_documento IN ('20304050-6','21314151-7','F7778888','22324252-8','23334353-9');
DELETE FROM clientes
 WHERE numero_documento IN ('20304050-6','21314151-7','F7778888','22324252-8','23334353-9');

-- ============================================================
--  PARTE 2 y 3 — CREAR cada cliente y luego su PAGO (en eorderback)
--  Sugerencia: crea el cliente, sincroniza (se registra), mete el pago,
--  sincroniza otra vez y revisa su historial de puntos.
-- ============================================================
USE eorderback;

-- ---------- 1) Marta Cordova (DUI) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (500, 'Marta Cordova', '7300-0001', 'marta.cordova.prueba@gmail.com', '20304050-6', 2);
-- Sincronizar -> se registra Marta (0 puntos).
-- Su pago de $40 (cobrado completo):
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (500, 500, NOW(), 40.00, 40.00, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (40.00, NOW(), 500, 1, '');
-- Sincronizar -> en el historial de Marta aparece $40 -> 40 puntos.

-- ---------- 2) Julio Ramirez (DUI) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (501, 'Julio Ramirez', '7300-0002', 'julio.ramirez.prueba@gmail.com', '21314151-7', 2);
-- Su pago de $25.50:
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (501, 501, NOW(), 25.50, 25.50, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (25.50, NOW(), 501, 1, '');
-- Sincronizar -> historial de Julio: $25.50 -> 25 puntos.

-- ---------- 3) Karen Ortiz (Pasaporte) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (502, 'Karen Ortiz', '7300-0003', 'karen.ortiz.prueba@gmail.com', 'F7778888', 4);
-- Su pago de $60:
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (502, 502, NOW(), 60.00, 60.00, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (60.00, NOW(), 502, 1, '');
-- Sincronizar -> historial de Karen: $60 -> 60 puntos.

-- ---------- 4) Roberto Salas (DUI) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (503, 'Roberto Salas', '7300-0004', 'roberto.salas.prueba@gmail.com', '22324252-8', 2);
-- Su pago de $18.75:
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (503, 503, NOW(), 18.75, 18.75, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (18.75, NOW(), 503, 1, '');
-- Sincronizar -> historial de Roberto: $18.75 -> 18 puntos.

-- ---------- 5) Consumidor final (SIN documento) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (504, 'Consumidor final', NULL, NULL, NULL, NULL);
-- Su pago de $30 (aunque pague, NO gana puntos: no está registrado):
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (504, 504, NOW(), 30.00, 30.00, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (30.00, NOW(), 504, 1, '');
-- Sincronizar -> queda como 'sin cliente' (sube el contador "Pagos sin cliente"). Correcto.

-- ---------- 6) Elena Portillo (DUI) ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (505, 'Elena Portillo', '7300-0006', 'elena.portillo.prueba@gmail.com', '23334353-9', 2);
-- Su pago de $33:
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (505, 505, NOW(), 33.00, 33.00, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (33.00, NOW(), 505, 1, '');
-- Sincronizar -> historial de Elena: $33 -> 33 puntos.

-- ============================================================
--  RESUMEN ESPERADO tras sincronizar todo:
--    Marta   -> 40 pts    Julio  -> 25 pts    Karen -> 60 pts
--    Roberto -> 18 pts    Elena  -> 33 pts
--    Consumidor final -> 0 pts (sin cliente)
--  Y si vuelves a sincronizar, NO se duplica nada.
-- ============================================================
