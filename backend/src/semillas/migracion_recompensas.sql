-- Migración: tabla de recompensas editables desde configuración
-- Reemplaza el catálogo fijo de recompensas.js por filas en BD.

CREATE TABLE IF NOT EXISTS recompensas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(120) NOT NULL,
  tipo      VARCHAR(60)  NOT NULL DEFAULT 'Estándar',
  puntos    INT          NOT NULL,
  activo    TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- Semilla con los datos actuales del hotel
INSERT INTO recompensas (nombre, tipo, puntos) VALUES
  ('Pasanoche (Dom a Jue)',                 'Estándar', 700),
  ('Pasadía (Dom a Jue)',                   'Estándar', 800),
  ('Estadía 24h · 2 personas (Dom a Jue)', 'Estándar', 1000),
  ('Pasanoche (Vie o Sáb)',                 'Estándar', 800),
  ('Pasadía (Vie o Sáb)',                   'Estándar', 800),
  ('Estadía 24h · 2 personas (Vie o Sáb)', 'Estándar', 1200);
