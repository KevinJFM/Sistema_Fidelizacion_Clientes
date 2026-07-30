// Preparación GLOBAL de las pruebas de integración (se ejecuta UNA vez).
// Crea la base de datos de prueba EN LIMPIO cargando el esquema real de
// producción (backend/src/semillas/bd_fidelizacion.sql), que es la fuente de
// verdad. Así los tests validan el mismo esquema que se desplegará.
import './env.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function () {
  const nombreBD = process.env.TEST_DB_NAME;

  // Conexión SIN base seleccionada, para poder crear/eliminar la BD de prueba.
  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  // Siempre partimos de cero (igual que el despliegue en limpio).
  await conexion.query(`DROP DATABASE IF EXISTS \`${nombreBD}\``);
  await conexion.query(
    `CREATE DATABASE \`${nombreBD}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conexion.changeUser({ database: nombreBD });

  // Cargamos el esquema real, quitando las líneas CREATE DATABASE / USE que
  // apuntan a la BD de producción (db_fidelizacion).
  const rutaSql = path.resolve(__dirname, '../../src/semillas/bd_fidelizacion.sql');
  const sqlCompleto = fs.readFileSync(rutaSql, 'utf8');
  const partes = sqlCompleto.split(/USE\s+db_fidelizacion\s*;/i);
  const sqlEsquema = partes[1] ?? sqlCompleto;
  await conexion.query(sqlEsquema);

  await conexion.end();
}
