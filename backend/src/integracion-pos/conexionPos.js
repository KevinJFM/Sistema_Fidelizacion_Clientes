// Conexión (solo lectura) a la base del POS externo. Los datos se guardan en pos_configuracion (editable desde "Integración POS").
// Credenciales por defecto: localhost:3306, root, sin contraseña, base eorderback.
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import pool from '../configuracion/bd.js';

let poolPos = null;
let firmaActual = ''; // para reconstruir el pool solo si cambian las credenciales

// Cifrado AES-256-GCM de la contraseña del POS. Requiere POS_ENCRYPTION_KEY (32 bytes hex); sin ella, se guarda sin cifrar.
const _getKey = () => {
  const raw = process.env.POS_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, 'hex');
  return buf.length === 32 ? buf : null;
};

const cifrarPassword = (texto) => {
  const key = _getKey();
  if (!key) {
    if (texto) console.warn('[conexionPos] POS_ENCRYPTION_KEY no configurada: la contraseña del POS se guardará sin cifrar.');
    return texto;
  }
  if (!texto) return texto;
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

// Perfiles de conexión: 'local' (POS en esta máquina) y 'web' (POS en el hosting/remoto).
// La sincronización usa siempre el perfil ACTIVO; los dos guardan credenciales por separado.
export const PERFILES_VALIDOS = ['local', 'web'];

// Lee un perfil del POS. Sin argumento devuelve el ACTIVO (el que usa la sincronización);
// con `perfil` devuelve ese en concreto. Columnas servidor/contrasena tienen alias host/password.
export const obtenerConfigPos = async (perfil = null) => {
  const filtro = perfil ? 'WHERE perfil = ?' : 'WHERE activo = 1';
  const args = perfil ? [perfil] : [];
  const [filas] = await pool.query(
    `SELECT id, perfil, servidor AS host, puerto, usuario, contrasena AS password, base_datos, modo, activo
       FROM pos_configuracion ${filtro} ORDER BY id LIMIT 1`,
    args
  );
  if (filas.length) return filas[0];
  // Respaldo: si aún no hay un perfil marcado como activo, toma el de menor id
  if (!perfil) {
    const [f2] = await pool.query(
      `SELECT id, perfil, servidor AS host, puerto, usuario, contrasena AS password, base_datos, modo, activo
         FROM pos_configuracion ORDER BY id LIMIT 1`
    );
    if (f2.length) return f2[0];
  }
  return { perfil: perfil || 'local', host: 'localhost', puerto: 3306, usuario: 'root', password: '', base_datos: 'eorderback', modo: 'manual', activo: 1 };
};

// Lista los dos perfiles (sin la contraseña) para pintar el selector Local/Web
export const listarPerfiles = async () => {
  const [filas] = await pool.query(
    `SELECT perfil, servidor AS host, puerto, usuario, base_datos, modo, activo,
            (contrasena IS NOT NULL AND contrasena <> '') AS tiene_password
       FROM pos_configuracion`
  );
  const porPerfil = new Map(filas.map((f) => [f.perfil, f]));
  // Devolver SIEMPRE los dos perfiles, aunque alguno no exista todavía en la tabla
  return PERFILES_VALIDOS.map((perfil) => {
    const f = porPerfil.get(perfil);
    if (f) return { ...f, activo: !!f.activo, tiene_password: !!f.tiene_password };
    return { perfil, host: 'localhost', puerto: 3306, usuario: 'root', base_datos: 'eorderback', modo: 'manual', activo: false, tiene_password: false };
  });
};

// Guarda (o crea) un perfil del POS. Sin `perfil`, actúa sobre el ACTIVO.
export const guardarConfigPos = async ({ host, puerto, usuario, password, base_datos, modo, perfil, idUsuario = null }) => {
  const perfilDestino = PERFILES_VALIDOS.includes(perfil) ? perfil : (await obtenerConfigPos()).perfil;
  const actual = await obtenerConfigPos(perfilDestino);
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

  const [filas] = await pool.query('SELECT id FROM pos_configuracion WHERE perfil = ? LIMIT 1', [perfilDestino]);
  if (filas.length) {
    await pool.query(
      'UPDATE pos_configuracion SET servidor=?, puerto=?, usuario=?, contrasena=?, base_datos=?, modo=?, configurado_por=? WHERE id=?',
      [nuevo.host, nuevo.puerto, nuevo.usuario, nuevo.password, nuevo.base_datos, nuevo.modo, idUsuario, filas[0].id]
    );
  } else {
    // Primera vez que se guarda este perfil: si aún no hay ninguno activo, este queda activo.
    const [hayActivo] = await pool.query('SELECT id FROM pos_configuracion WHERE activo = 1 LIMIT 1');
    await pool.query(
      'INSERT INTO pos_configuracion (perfil, servidor, puerto, usuario, contrasena, base_datos, modo, activo, configurado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [perfilDestino, nuevo.host, nuevo.puerto, nuevo.usuario, nuevo.password, nuevo.base_datos, nuevo.modo, hayActivo.length ? 0 : 1, idUsuario]
    );
  }
  poolPos = null; // fuerza reconstruir el pool con los datos nuevos
  return { ...nuevo, perfil: perfilDestino };
};

// Marca un perfil como activo (el que usará la sincronización). Devuelve la config activa.
export const activarPerfil = async (perfil) => {
  if (!PERFILES_VALIDOS.includes(perfil)) throw new Error('Perfil inválido');
  // Si el perfil aún no existe en la tabla, créalo con valores por defecto (inactivo por ahora)
  const [existe] = await pool.query('SELECT id FROM pos_configuracion WHERE perfil = ? LIMIT 1', [perfil]);
  if (!existe.length) {
    await pool.query(
      "INSERT INTO pos_configuracion (perfil, servidor, puerto, usuario, contrasena, base_datos, modo, activo) VALUES (?, 'localhost', 3306, 'root', '', 'eorderback', 'manual', 0)",
      [perfil]
    );
  }
  await pool.query('UPDATE pos_configuracion SET activo = IF(perfil = ?, 1, 0)', [perfil]);
  poolPos = null; // fuerza reconstruir el pool con el perfil nuevo
  return obtenerConfigPos();
};

// Devuelve un pool hacia el POS, reconstruyéndolo si cambió la configuración
export const obtenerPoolPos = async () => {
  const cfg = await obtenerConfigPos();
  const firma = `${cfg.perfil}:${cfg.host}:${cfg.puerto}:${cfg.usuario}:${cfg.password}:${cfg.base_datos}`;
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
