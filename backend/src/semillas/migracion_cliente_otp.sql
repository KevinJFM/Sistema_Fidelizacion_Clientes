-- ============================================================
--  Migración: código de verificación (OTP) del portal del cliente
--  El cliente entra con su DUI y un código de 6 dígitos que se le
--  envía por correo (un solo uso, con vencimiento). Reemplaza al PIN.
--  El código se guarda hasheado (bcrypt), nunca en texto plano.
-- ============================================================
ALTER TABLE clientes
  ADD COLUMN otp_hash     VARCHAR(255) NULL AFTER pin_hash,
  ADD COLUMN otp_expira   DATETIME     NULL AFTER otp_hash,
  ADD COLUMN otp_intentos INT NOT NULL DEFAULT 0 AFTER otp_expira;
