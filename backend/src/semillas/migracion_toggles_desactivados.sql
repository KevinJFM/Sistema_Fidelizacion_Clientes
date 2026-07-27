-- Migración: poner bienvenida y descuento por compra alta en OFF por defecto.
-- Los toggles ahora inician desactivados; el administrador decide cuándo activarlos.
-- Ejecutar una sola vez en la BD existente.
USE db_fidelizacion;

UPDATE configuracion SET valor = '0' WHERE clave IN ('bienvenida_activo', 'descuento_monto_activo');
