-- ============================================================
--  Integración con el sistema de ventas (POS externo).
--  Estas tablas son ADITIVAS: viven en NUESTRA base (db_fidelizacion)
--  y NO modifican ninguna tabla existente ni la base del POS.
--  Ejecutar una vez sobre db_fidelizacion.
-- ============================================================
USE db_fidelizacion;

-- Datos de conexión al POS + modo (automático / manual). Una sola fila.
CREATE TABLE IF NOT EXISTS pos_configuracion (
  id          INT NOT NULL AUTO_INCREMENT,
  host        VARCHAR(120) NOT NULL DEFAULT 'localhost',
  puerto      INT          NOT NULL DEFAULT 3306,
  usuario     VARCHAR(120) NOT NULL DEFAULT 'root',
  password    VARCHAR(255) NOT NULL DEFAULT '',        -- OJO: texto plano (uso local/tesis). Recomendado: usuario MySQL de solo lectura.
  base_datos  VARCHAR(120) NOT NULL DEFAULT 'eorderback',
  modo        ENUM('automatico','manual') NOT NULL DEFAULT 'manual',
  PRIMARY KEY (id)
);

-- Fila inicial con las credenciales por defecto.
-- CAMBIA host/puerto/usuario/password/base por los tuyos (o desde la pantalla del sistema).
INSERT INTO pos_configuracion (host, puerto, usuario, password, base_datos, modo)
SELECT 'localhost', 3306, 'root', '', 'eorderback', 'manual' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pos_configuracion);

-- Control de pedidos del POS ya convertidos en transacción (evita duplicados).
CREATE TABLE IF NOT EXISTS pos_pedido_procesado (
  id              INT NOT NULL AUTO_INCREMENT,
  id_pedido_pos   INT NOT NULL,                 -- idPedido en la base del POS
  id_transaccion  INT NULL,                     -- transacción creada en nuestra base
  id_cliente      INT NULL,                     -- cliente de fidelización al que se otorgó
  resultado       VARCHAR(30) NOT NULL DEFAULT 'creada',  -- creada | sin_cliente
  detalle         VARCHAR(200) NULL,
  fecha_procesado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pos_pedido (id_pedido_pos)
);
