SET NAMES utf8mb4;
ALTER TABLE recompensas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

UPDATE recompensas SET nombre = 'Pasanoche (Dom a Jue)',                  tipo = 'Estándar' WHERE id = 1;
UPDATE recompensas SET nombre = 'Pasadía (Dom a Jue)',                    tipo = 'Estándar' WHERE id = 2;
UPDATE recompensas SET nombre = 'Estadía 24h · 2 personas (Dom a Jue)',   tipo = 'Estándar' WHERE id = 3;
UPDATE recompensas SET nombre = 'Pasanoche (Vie o Sáb)',                  tipo = 'Estándar' WHERE id = 4;
UPDATE recompensas SET nombre = 'Pasadía (Vie o Sáb)',                    tipo = 'Estándar' WHERE id = 5;
UPDATE recompensas SET nombre = 'Estadía 24h · 2 personas (Vie o Sáb)',   tipo = 'Estándar' WHERE id = 6;
