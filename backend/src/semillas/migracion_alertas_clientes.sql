-- ============================================================
--  Migración: tabla para rastrear alertas de correo enviadas
--  a clientes (cerca del canje y reactivación).
--  Evita re-enviar la misma alerta hasta que pase el cooldown.
-- ============================================================
USE db_fidelizacion;

CREATE TABLE IF NOT EXISTS alertas_enviadas (
  id            INT          AUTO_INCREMENT PRIMARY KEY,
  id_cliente    INT          NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,       -- 'cerca_canje' | 'reactivacion'
  referencia    VARCHAR(100) NULL,           -- id_recompensa para cerca_canje; NULL para reactivacion
  fecha_enviada DATETIME     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_cliente_tipo (id_cliente, tipo, referencia)
);
