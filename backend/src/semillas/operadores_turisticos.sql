-- ============================================================
--  MÓDULO TOUR OPERADORES (B2B) — tablas y reglas
--  Programa de puntos para empresas que traen grupos al hotel.
--  Ejecuta sobre la BD existente para probar. Para la BD final,
--  esto se integrará dentro de bd_fidelizacion.sql.
--  NOTA: los puntos son DECIMAL (1.5 por persona, 0.5% de consumo).
-- ============================================================
USE db_fidelizacion;

-- Catálogo de operadores turísticos (empresas, no personas)
CREATE TABLE IF NOT EXISTS operadores_turisticos (
  id_operador       INT NOT NULL AUTO_INCREMENT,
  nombre            VARCHAR(120)  NOT NULL,
  telefono          VARCHAR(20)   NULL,
  correo            VARCHAR(120)  NULL,
  puntos_acumulados DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  id_estado         INT NOT NULL DEFAULT 1,               -- 1=activo, 2=inactivo
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_operador),
  CONSTRAINT fk_operador_estado FOREIGN KEY (id_estado) REFERENCES estados(id_estado)
);

-- Registro de cada grupo/visita del operador y los puntos otorgados
CREATE TABLE IF NOT EXISTS transacciones_operador (
  id_transaccion_op  INT NOT NULL AUTO_INCREMENT,
  id_operador        INT NOT NULL,
  id_usuario         INT NOT NULL,                         -- recepcionista/admin que registró
  num_personas       INT NOT NULL DEFAULT 0,
  monto_habitaciones DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  monto_consumo      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  puntos_personas    DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- 1.5 x personas (si grupo >= mínimo)
  puntos_consumo     DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- 0.5% de (habitaciones + consumo)
  puntos_otorgados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- total
  puntos_canjeados   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_transaccion_op),
  CONSTRAINT fk_transop_operador FOREIGN KEY (id_operador) REFERENCES operadores_turisticos(id_operador),
  CONSTRAINT fk_transop_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario)
);

-- Reglas configurables del programa de operadores (reusa la tabla configuracion)
INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('operador_puntos_persona',   '1.5',   'Puntos por persona cuando el grupo llega al mínimo'),
  ('operador_min_personas',     '5',     'Mínimo de personas para otorgar puntos por grupo'),
  ('operador_valor_punto',      '1',     'Valor en $ de cada punto al canjear'),
  ('operador_tasa_hab_consumo', '0.005', 'Puntos ganados por cada $1 en habitaciones y consumo');
