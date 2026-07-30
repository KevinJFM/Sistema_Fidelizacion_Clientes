// Siembra la base de datos para las pruebas E2E (Playwright).
// Crea `db_fidelizacion_e2e` EN LIMPIO desde el esquema real de producción y
// agrega un usuario admin conocido para poder iniciar sesión desde el navegador.
//
// Lo lanza el webServer del backend en playwright.config.js ANTES de arrancar
// el servidor, así la BD siempre existe cuando llega la primera petición.
//
// Uso:  node test/helpers/seedE2E.js   (desde la carpeta backend/)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Credenciales del admin de pruebas (las usa la prueba E2E del panel para el login).
export const ADMIN_E2E = { email: 'admin@e2e.com', contrasena: 'Password123' };

// Cliente de fidelización para la E2E del PORTAL: documento + código OTP conocido
// (para poder iniciar sesión desde el navegador sin depender del correo).
export const CLIENTE_E2E = {
  tipo_documento: 'DUI',
  numero_documento: '98765432-1',
  nombres: 'Ana',
  apellidos: 'Cliente',
  correo: 'ana@e2e.com',
  puntos: 500,
  codigo: '123456',
};

async function sembrar() {
  const nombreBD = process.env.DB_NAME || 'db_fidelizacion_e2e';

  // Salvaguarda: nunca tocar la BD real de desarrollo/producción.
  if (nombreBD === 'db_fidelizacion') {
    throw new Error('seedE2E: DB_NAME apunta a la BD real (db_fidelizacion). Abortando por seguridad.');
  }

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  // BD en limpio (igual que el despliegue en producción).
  await conexion.query(`DROP DATABASE IF EXISTS \`${nombreBD}\``);
  await conexion.query(
    `CREATE DATABASE \`${nombreBD}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conexion.changeUser({ database: nombreBD });

  // Carga el esquema real, sin las líneas CREATE DATABASE / USE de la BD real.
  const rutaSql = path.resolve(__dirname, '../../src/semillas/bd_fidelizacion.sql');
  const sqlCompleto = fs.readFileSync(rutaSql, 'utf8');
  const partes = sqlCompleto.split(/USE\s+db_fidelizacion\s*;/i);
  await conexion.query(partes[1] ?? sqlCompleto);

  // Usuario admin para iniciar sesión desde el navegador (E2E del panel).
  const hash = await bcrypt.hash(ADMIN_E2E.contrasena, 10);
  await conexion.query(
    `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, id_rol, id_estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Admin', 'E2E', ADMIN_E2E.email, hash, '00000000', 1 /* admin */, 1 /* activo */]
  );

  // Cliente para la E2E del portal, con un código OTP conocido (vigente 1 día)
  // para poder entrar sin depender del correo.
  const otpHash = await bcrypt.hash(CLIENTE_E2E.codigo, 10);
  const otpExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await conexion.query(
    `INSERT INTO clientes
       (id_tipo_documento, numero_documento, nombres, apellidos, correo,
        puntos_acumulados, otp_hash, otp_expira, otp_intentos, id_estado)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    [CLIENTE_E2E.numero_documento, CLIENTE_E2E.nombres, CLIENTE_E2E.apellidos,
     CLIENTE_E2E.correo, CLIENTE_E2E.puntos, otpHash, otpExpira]
  );

  await conexion.end();
  console.log(`[seedE2E] Base de datos "${nombreBD}" creada y sembrada (admin: ${ADMIN_E2E.email}, cliente: ${CLIENTE_E2E.numero_documento}).`);
}

sembrar().catch((err) => {
  console.error('[seedE2E] Error al sembrar la BD E2E:', err.message);
  process.exit(1);
});
