-- ============================================================
--  Migración: token de notificaciones push del cliente
--  Guarda el token del dispositivo (Expo Push Token) para poder
--  enviarle notificaciones a la barra del teléfono cuando se le
--  registra una transacción o un canje.
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN push_token VARCHAR(255) NULL AFTER otp_intentos;
