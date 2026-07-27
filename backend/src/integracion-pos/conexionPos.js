// ============================================================
//  Conexión (solo lectura) a la base del POS externo.
//  Los datos de conexión se guardan en la tabla pos_configuracion
//  de NUESTRA base y se pueden editar desde la pantalla del sistema.
//
//  >>> CREDENCIALES POR DEFECTO <<<
//  La tabla pos_configuracion nace con una fila por defecto (ver el .sql de
//  creación de la BD, semilla_empresa/db_fidelizacion_merasopa.sql):
//    servidor: localhost | puerto: 3306 | usuario: root | contrasena: (vacío) | base: eorderback
//  Cámbialas desde la pantalla "Integración POS" o en esa tabla.
// ============================================================
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import pool from '../configuracion/bd.js';

let poolPos = null;
let firmaActual = ''; // para reconstruir el pool solo si cambian las credenciales

// ─── Cifrado AES-256-GCM de la contraseña del POS ────────────────────────────
// Requiere POS_ENCRYPTION_KEY en .env: 32 bytes aleatorios en hex (64 chars).
// Si la clave no está configurada, la contraseña se guarda sin cifrar (compat. hacia atrás).
const _getKey = () => {
  const raw = process.env.POS_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, 'hex');
  return buf.length === 32 ? buf : null;
};

const cifrarPassword = (texto) => {
  const key = _getKey();
  if (!key || !texto) return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${Buffer.concat([iv, tag, cifrado]).toString('base64')}`;
};

const descifrarPassword = (texto) => {
  if (!texto || !String(texto).startsWith('enc:')) return texto; // texto plano o vacío
  const key = _getKey();
  if (!key) {
    console.warn('[conexionPos] POS_ENCRYPTION_KEY no configurada; no se puede descifrar la contraseña del POS');
    return '';
  }
  const buf = Buffer.from(String(texto).slice(4), 'base64');
  const iv      = buf.subarray(0, 12);
  const tag     = buf.subarray(12, 28);
  const cifrado = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
};

// Lee la única fila de configuración del POS (crea el objeto por defecto si no existe)
export const obtenerConfigPos = async () => {
  // Las columnas se llaman servidor/contrasena (host y password son palabras reservadas
  // en MySQL). Con alias, el resto del código sigue usando .host y .password.
  const [filas] = await pool.query(
    `SELECT id, servidor AS host, puerto, usuario, contrasena AS password, base_datos, modo
       FROM pos_configuracion ORDER BY id LIMIT 1`
  );
  if (filas.length) return filas[0];
  return { host: 'localhost', puerto: 3306, usuario: 'root', password: '', base_datos: 'eorderback', modo: 'manual' };
};

// Guarda (o crea) la configuración del POS
export const guardarConfigPos = async ({ host, puerto, usuario, password, base_datos, modo }) => {
  const actual = await obtenerConfigPos();
  const nuevo = {
    host: host ?? actual.host,
    puerto: Number(puerto ?? actual.puerto),
    usuario: usuario ?? actual.usuario,
    // Si viene vacío/undefined, conservar la contraseña anterior; si viene nueva, cifrarla
    password: password === undefined || password === null
      ? actual.password
      : cifrarPassword(password),
    base_datos: base_datos ?? actual.base_datos,
    modo: modo ?? actual.modo,
  };

  const [filas] = await pool.query('SELECT id FROM pos_configuracion ORDER BY id LIMIT 1');
  if (filas.length) {
    await pool.query(
      'UPDATE pos_configuracion SET servidor=?, puerto=?, usuario=?, contrasena=?, base_datos=?, modo=? WHERE id=?',
      [nuevo.host, nuevo.puerto, nuevo.usuario, nuevo.password, nuevo.base_datos, nuevo.modo, filas[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO pos_configuracion (servidor, puerto, usuario, contrasena, base_datos, modo) VALUES (?, ?, ?, ?, ?, ?)',
      [nuevo.host, nuevo.puerto, nuevo.usuario, nuevo.password, nuevo.base_datos, nuevo.modo]
    );
  }
  poolPos = null; // fuerza reconstruir el pool con los datos nuevos
  return nuevo;
};

// Devuelve un pool hacia el POS, reconstruyéndolo si cambió la configuración
export const obtenerPoolPos = async () => {
  const cfg = await obtenerConfigPos();
  const firma = `${cfg.host}:${cfg.puerto}:${cfg.usuario}:${cfg.password}:${cfg.base_datos}`;
  if (!poolPos || firma !== firmaActual) {
    if (poolPos) { try { await poolPos.end(); } catch { /* ignorar */ } }
    poolPos = mysql.createPool({
      host: cfg.host,
      port: Number(cfg.puerto),
      user: cfg.usuario,
      password: descifrarPassword(cfg.password),
      database: cfg.base_datos,
      waitForConnections: true,
      connectionLimit: 4,
      // El POS usa charset latin1/utf8mb3; dejamos que mysql2 negocie por defecto.
    });
    firmaActual = firma;
  }
  return poolPos;
};

// Prueba la conexión con unos datos (sin guardarlos). Devuelve { ok, mensaje }.
export const probarConexionPos = async ({ host, puerto, usuario, password, base_datos }) => {
  let conexion;
  try {
    conexion = await mysql.createConnection({
      host, port: Number(puerto), user: usuario,
      password: descifrarPassword(password), // descifra si viene cifrada de la BD
      database: base_datos,
      connectTimeout: 6000,
    });
    await conexion.query('SELECT 1');
    return { ok: true, mensaje: 'Conexión exitosa a la base de datos del POS.' };
  } catch (e) {
    return { ok: false, mensaje: `No se pudo conectar: ${e.code || e.message}` };
  } finally {
    if (conexion) { try { await conexion.end(); } catch { /* ignorar */ } }
  }
};
