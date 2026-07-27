-- Migración: tabla de control de alertas de retención enviadas por correo.
-- Evita reenviar el mismo correo más de una vez cada 30 días.
-- Ejecutar una sola vez en la BD de producción.
USE db_fidelizacion;

CREATE TABLE IF NOT EXISTS alertas_enviadas (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  id_cliente   INT UNSIGNED    NOT NULL,
  tipo         VARCHAR(40)     NOT NULL,
  referencia   VARCHAR(40)     NULL,
  fecha_enviada DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ae_cliente_tipo (id_cliente, tipo, fecha_enviada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
