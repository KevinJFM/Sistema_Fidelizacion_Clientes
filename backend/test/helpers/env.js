// Variables de entorno para el entorno de PRUEBAS.
// Reutiliza el .env real del backend (credenciales de MySQL, secretos JWT, etc.)
// pero FUERZA una base de datos separada para no tocar los datos de desarrollo.
//
// Se importa como efecto secundario (import './env.js') tanto en el globalSetup
// como en el setupFiles, y SIEMPRE antes de importar la conexión (bd.js), para
// que el pool nazca apuntando a la BD de prueba.
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/.env  (dos niveles arriba de test/helpers)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
// Nombre de la BD de prueba (se puede sobreescribir con TEST_DB_NAME en el .env).
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'db_fidelizacion_test';
process.env.DB_NAME = process.env.TEST_DB_NAME;
// El app exige CLIENT_URL para CORS; en pruebas basta un valor cualquiera.
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Desactiva el envío de correos reales en pruebas: sin credenciales de correo,
// enviarCodigoAcceso() no manda nada (correo.js devuelve null si no están puestas).
// Así las pruebas del portal (OTP) NUNCA envían un email de verdad.
delete process.env.CORREO_USUARIO;
delete process.env.CORREO_CLAVE;
