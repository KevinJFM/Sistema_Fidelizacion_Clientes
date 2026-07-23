-- ============================================================
--  DATOS DE PRUEBA — 2 clientes con todo lo necesario (ejecutar sobre `eorderback`)
--  Puedes correr el archivo COMPLETO de un solo. Luego, en el sistema:
--  Integración POS -> "Sincronizar ahora".
--
--  Resultado esperado tras sincronizar:
--   - Se CREA "vale Lopez" (DUI 02345678-9) en tu módulo de Clientes
--     con una transacción de $51 -> 51 puntos.
--   - El cliente del correo recibe una transacción de $22.50 -> 22 puntos
--     (emparejado, NO se crea otro). OJO: ese correo debe existir en tu
--     módulo de Clientes; si no, saldrá como "sin cliente identificado".
-- ============================================================
USE eorderback;

-- ============================================================
--  CLIENTE 1 — Con DUI: se AUTO-CREA en fidelización
--  (tipo DUI = idDocumento 2; el número del DUI va en el campo NIT)
-- ============================================================
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento)
VALUES (203, 'vale Lopez', '8010-2060', 'valelopez1@gmail.com', '02345678-9', 2);

-- Su pedido, cobrado por completo
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (203, 203, NOW(), 51.00, 51.00, 1);

INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (51.00, NOW(), 203, 1, '');

-- ============================================================
--  CLIENTE 2 — Por CORREO: se empareja con un cliente YA registrado
--  >>> Este correo DEBE existir en tu módulo de Clientes de fidelización.
--  >>> Registra primero a "Benjamin Mendoza" con ese correo en el módulo,
--  >>> o cambia el correo por el de un cliente existente.
-- ============================================================
INSERT INTO cliente (idCliente, nombre, email)
VALUES (204, 'Benjamin Mendoza', 'benjamin.mendoza@gmail.com');

-- Su pedido, cobrado por completo
INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado)
VALUES (204, 204, NOW(), 22.50, 22.50, 1);

INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia)
VALUES (22.50, NOW(), 204, 1, '');

-- ============================================================
--  10 CLIENTES DE PRUEBA (ids 300–309) — todos con pedido PAGADO
--  Puedes correr este bloque completo de un solo.
--  Al sincronizar: se crean los 10 en el módulo de Clientes
--  (8 con DUI y 2 con Pasaporte) con su transacción y puntos.
-- ============================================================
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento) VALUES
(300, 'Ana Martinez',     '7100-0001', 'ana.martinez.prueba@gmail.com',    '01234567-8', 2),
(301, 'Luis Hernandez',   '7100-0002', 'luis.hernandez.prueba@gmail.com',  '03456789-0', 2),
(302, 'Carmen Rivas',     '7100-0003', 'carmen.rivas.prueba@gmail.com',    '04567891-2', 2),
(303, 'Jose Portillo',    '7100-0004', 'jose.portillo.prueba@gmail.com',   '06789012-3', 2),
(304, 'Sofia Aguilar',    '7100-0005', 'sofia.aguilar.prueba@gmail.com',   '07890123-4', 2),
(305, 'Diego Castillo',   '7100-0006', 'diego.castillo.prueba@gmail.com',  '08901234-5', 2),
(306, 'Lucia Menjivar',   '7100-0007', 'lucia.menjivar.prueba@gmail.com',  '09012345-6', 2),
(307, 'Marcos Guardado',  '7100-0008', 'marcos.guardado.prueba@gmail.com', '01122334-5', 2),
(308, 'Emma Johnson',     '7100-0009', 'emma.johnson.prueba@gmail.com',    'B1234567',   4),
(309, 'Liam Smith',       '7100-0010', 'liam.smith.prueba@gmail.com',      'C7654321',   4);

INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago, cancelado) VALUES
(300, 300, NOW(), 15.75, 15.75, 1),
(301, 301, NOW(), 28.00, 28.00, 1),
(302, 302, NOW(), 42.50, 42.50, 1),
(303, 303, NOW(), 60.00, 60.00, 1),
(304, 304, NOW(), 12.25, 12.25, 1),
(305, 305, NOW(), 75.00, 75.00, 1),
(306, 306, NOW(), 33.00, 33.00, 1),
(307, 307, NOW(), 19.99, 19.99, 1),
(308, 308, NOW(), 88.00, 88.00, 1),
(309, 309, NOW(), 55.50, 55.50, 1);

INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia) VALUES
(15.75, NOW(), 300, 1, ''),
(28.00, NOW(), 301, 1, ''),
(42.50, NOW(), 302, 1, ''),
(60.00, NOW(), 303, 1, ''),
(12.25, NOW(), 304, 1, ''),
(75.00, NOW(), 305, 1, ''),
(33.00, NOW(), 306, 1, ''),
(19.99, NOW(), 307, 1, ''),
(88.00, NOW(), 308, 1, ''),
(55.50, NOW(), 309, 1, '');
-- Puntos esperados: 300→15, 301→28, 302→42, 303→60, 304→12,
--                   305→75, 306→33, 307→19, 308→88, 309→55.

-- ============================================================
--  2 CLIENTES CON ABONOS (ids 310 y 311)
--  Corre la PARTE A, sincroniza (NO deben ganar puntos porque el
--  pago está incompleto) y MÁS TARDE corre la PARTE B y sincroniza
--  (ahí sí: se crean con la transacción completa).
-- ============================================================

-- ---------- PARTE A: cliente + pedido + PRIMER abono ----------
INSERT INTO cliente (idCliente, nombre, telefono, email, NIT, idDocumento) VALUES
(310, 'Rosa Campos',   '7100-0011', 'rosa.campos.prueba@gmail.com',   '02233445-6', 2),
(311, 'Pedro Fuentes', '7100-0012', 'pedro.fuentes.prueba@gmail.com', '03344556-7', 2);

INSERT INTO pedido (idPedido, idCliente, fecha, total, totalPago) VALUES
(310, 310, NOW(), 80.00, 80.00),
(311, 311, NOW(), 45.50, 45.50);

-- Primer abono (incompleto): Rosa abona $30 de $80 y Pedro $20 de $45.50
INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia) VALUES
(30.00, NOW(), 310, 1, ''),
(20.00, NOW(), 311, 1, '');
-- >> Sincronizar: NADA para 310 y 311 (pagos incompletos). Correcto.

-- ---------- PARTE B: SEGUNDO abono (correr MÁS TARDE) ----------
-- INSERT INTO pago_combinado (monto, fechaPago, idPedido, idCuenta, referencia) VALUES
-- (50.00, NOW(), 310, 1, ''),   -- Rosa completa: $30 + $50 = $80  -> 80 puntos
-- (25.50, NOW(), 311, 1, '');   -- Pedro completa: $20 + $25.50 = $45.50 -> 45 puntos
-- UPDATE pedido SET cancelado = 1 WHERE idPedido IN (310, 311);
-- >> Sincronizar: se crean Rosa (80 pts) y Pedro (45 pts) con la fecha del último pago.

-- ============================================================
--  LIMPIEZA (opcional, para repetir la prueba desde cero)
-- ============================================================
-- DELETE FROM pago_combinado WHERE idPedido BETWEEN 200 AND 311;
-- DELETE FROM pedido        WHERE idPedido BETWEEN 200 AND 311;
-- DELETE FROM cliente       WHERE idCliente BETWEEN 200 AND 311;
-- Y en db_fidelizacion:  DELETE FROM pos_pedido_procesado WHERE id_pedido_pos BETWEEN 200 AND 311;
