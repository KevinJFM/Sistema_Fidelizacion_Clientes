-- ============================================================
--  PRUEBAS de la Integración POS  (ejecutar sobre la BD `eorderback`)
--  Ve corriendo cada paso POR SEPARADO y, entre pasos, dale
--  "Sincronizar ahora" en el módulo Integración POS para comprobar.
--
--  NOTA: la PRIMERA sincronización marcará los pedidos viejos del dump
--  (6–17 y 20, todos de "Consumidor final") como "sin cliente identificado".
--  Es lo esperado: no otorgan puntos.
-- ============================================================
USE eorderback;

-- ============================================================
--  PRUEBA 1 — Cliente con DUI: se AUTO-CREA en fidelización
-- ============================================================

-- 1.1  Cliente del POS con tipo de documento DUI (idDocumento = 2)
--      y el número de DUI en el campo NIT.
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (100, 'Carlos Ramirez', '7777-1111', 'carlos.ramirez@gmail.com', '04567890-1', 2);

-- 1.2  Pedido de $25 SIN pagar todavía.
--      >> Sincronizar: NO debe pasar nada (no está pagado).
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago)
VALUES (100, 100, NOW(), 25.00, 25.00);

-- 1.3  Se paga completo.
--      >> Sincronizar: crea al cliente "Carlos Ramirez" (DUI 04567890-1)
--         en el módulo de Clientes + transacción de $25 → 25 puntos.
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (25.00, NOW(), 100, 1, '');
UPDATE pedido SET cancelado = 1 WHERE idPedido = 100;  -- cuenta cobrada (como hace el POS)

-- ============================================================
--  PRUEBA 2 — Pago PARCIAL: no otorga puntos hasta completar
-- ============================================================

-- 2.1  Otro pedido de Carlos por $40.
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago)
VALUES (101, 100, NOW(), 40.00, 40.00);

-- 2.2  Abono de solo $15.
--      >> Sincronizar: NO debe pasar nada (pago incompleto).
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta)
VALUES (15.00, NOW(), 101, 1);

-- 2.3  Paga el resto ($25).
--      >> Sincronizar: transacción de $40 → 40 puntos (saldo de Carlos: 65).
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta)
VALUES (25.00, NOW(), 101, 1);
UPDATE pedido SET cancelado = 1 WHERE idPedido = 101;

-- ============================================================
--  PRUEBA 3 — Emparejar por CORREO (cliente ya registrado en fidelización)
-- ============================================================

-- 3.1  Cliente del POS SIN documento, pero con el correo de un cliente
--      que YA existe en tu módulo de clientes.
--      >>> CAMBIA el correo por uno real de tu BD de fidelización <<<
INSERT INTO cliente (idCliente, nombre, email)
VALUES (101, 'Javier Mendoza', 'CAMBIA-ESTE-CORREO@gmail.com');

-- 3.2  Pedido pagado de ese cliente.
--      >> Sincronizar: transacción de $18.50 → 18 puntos para el cliente
--         emparejado por correo (NO se crea uno nuevo).
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago)
VALUES (102, 101, NOW(), 18.50, 18.50);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta)
VALUES (18.50, NOW(), 102, 1);
UPDATE pedido SET cancelado = 1 WHERE idPedido = 102;

-- ============================================================
--  PRUEBA 4 — "Consumidor final": NO gana puntos
-- ============================================================

-- Pedido pagado del cliente 10 (Consumidor final, sin datos identificables).
-- >> Sincronizar: se marca "sin cliente identificado", no otorga nada.
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago)
VALUES (103, 10, NOW(), 12.00, 12.00);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta)
VALUES (12.00, NOW(), 103, 1);
UPDATE pedido SET cancelado = 1 WHERE idPedido = 103;

-- ============================================================
--  PRUEBA 5 — Pedido ANULADO: se ignora aunque tenga pago
-- ============================================================

INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, anular)
VALUES (104, 100, NOW(), 30.00, 30.00, 1);
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta)
VALUES (30.00, NOW(), 104, 1);
-- >> Sincronizar: NO genera nada (está anulado).

-- ============================================================
--  LIMPIEZA (opcional, para repetir las pruebas desde cero)
-- ============================================================
-- DELETE FROM pago_combinado WHERE idPedido IN (100,101,102,103,104);
-- DELETE FROM pedido        WHERE idPedido IN (100,101,102,103,104);
-- DELETE FROM cliente       WHERE idCliente IN (100,101);
-- Y en db_fidelizacion:  DELETE FROM pos_pedido_procesado;  (para reprocesar)
