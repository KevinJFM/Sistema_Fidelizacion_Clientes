// Utilidades para las pruebas de integración: limpiar la BD entre tests y
// sembrar datos (usuarios, clientes, recompensas, promociones, configuración).
// Usa el MISMO pool que la aplicación (apuntando a la BD de prueba porque el
// entorno ya se ajustó en env.js / setupIntegracion.js).
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import pool from '../../src/configuracion/bd.js';

export { pool };

// Tablas que los tests modifican y que se vacían antes de cada caso.
// (NO se tocan los catálogos: estados, roles, tipos_documento, ubicaciones,
//  configuracion, recompensas — vienen sembrados por el esquema.)
const TABLAS_MUTABLES = [
  'alertas_enviadas_operador',
  'transacciones_operador',
  'operadores_turisticos',
  'movimientos_puntos',
  'transacciones',
  'refresh_tokens',
  'bitacora',
  'alertas_enviadas',
  'beneficios_emitidos',
  'recompensas',
  'promociones',
  'clientes',
  'usuarios',
];

// Valores por defecto de la tabla configuracion (según el esquema).
const CONFIG_DEFECTO = {
  bienvenida_puntos: '20',
  bienvenida_descuento: '2',
  canje_activo: '1',
  bienvenida_activo: '0',
};

// Deja la BD como recién sembrada: vacía las tablas mutables y restaura la
// configuración a sus valores por defecto. Se llama en un beforeEach.
export async function limpiar() {
  const cx = await pool.getConnection();
  try {
    await cx.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of TABLAS_MUTABLES) {
      await cx.query(`TRUNCATE TABLE \`${tabla}\``);
    }
    await cx.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    cx.release();
  }
  for (const [clave, valor] of Object.entries(CONFIG_DEFECTO)) {
    await setConfig(clave, valor);
  }
}

// Inserta/actualiza una clave de configuración.
export async function setConfig(clave, valor) {
  await pool.query(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
    [clave, String(valor)]
  );
}

// Crea un usuario del sistema (por defecto admin activo). Devuelve sus datos
// y la contraseña en claro (para poder probar el login real).
export async function crearUsuario({
  nombre = 'Admin',
  apellido = 'Prueba',
  email = `admin_${Date.now()}@test.com`,
  contrasena = 'Password123',
  telefono = '00000000',
  rol = 'admin',
  estado = 1, // 1=activo, 2=inactivo, 3=suspendido
} = {}) {
  const [roles] = await pool.query('SELECT id_rol FROM roles WHERE rol = ?', [rol]);
  const id_rol = roles[0].id_rol;
  const hash = await bcrypt.hash(contrasena, 10);
  const [r] = await pool.query(
    `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, id_rol, id_estado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido, email, hash, telefono, id_rol, estado]
  );
  return { id_usuario: r.insertId, nombre, apellido, email, contrasena, rol };
}

// Firma un token de acceso válido para un usuario (evita pasar por el login
// cuando el test solo necesita autenticación, no probarla).
export function firmarToken({ id_usuario, email, rol }) {
  return jwt.sign(
    { id_usuario, email, rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// Atajo: crea un usuario y devuelve { usuario, token }.
export async function crearUsuarioConToken(opciones = {}) {
  const usuario = await crearUsuario(opciones);
  const token = firmarToken(usuario);
  return { usuario, token };
}

// Crea un cliente de fidelización. Devuelve el id.
export async function crearCliente({
  id_tipo_documento = 1, // 1=DUI
  numero_documento = `DOC-${Date.now()}`,
  nombres = 'Juan',
  apellidos = 'Pérez',
  telefono = null,
  correo = null,
  puntos = 0,
  estado = 1,
  id_departamento = null,
  id_distrito = null,
} = {}) {
  const [r] = await pool.query(
    `INSERT INTO clientes
       (id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo,
        puntos_acumulados, id_estado, id_departamento, id_distrito)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo,
     puntos, estado, id_departamento, id_distrito]
  );
  return r.insertId;
}

// Crea una recompensa del catálogo de canje. Devuelve el id.
export async function crearRecompensa({
  nombre = 'Premio de prueba',
  tipo = 'Estándar',
  puntos = 100,
  activo = 1,
} = {}) {
  const [r] = await pool.query(
    'INSERT INTO recompensas (nombre, tipo, puntos, activo) VALUES (?, ?, ?, ?)',
    [nombre, tipo, puntos, activo]
  );
  return r.insertId;
}

// Crea una promoción. Devuelve el id_escenario.
export async function crearPromocion({
  nombre = 'Promo de prueba',
  fecha_inicio = null,
  fecha_fin = null,
  fecha_especial = null,
  puntos_extra = 0,
  descuento_extra = 0,
  max_usos_cliente = 1,
  activo = 1,
} = {}) {
  const [r] = await pool.query(
    `INSERT INTO promociones
       (nombre, fecha_inicio, fecha_fin, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, fecha_inicio, fecha_fin, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo]
  );
  return r.insertId;
}

// ===== Helpers del PORTAL del cliente (acceso por código OTP) =====

// Fija un código OTP conocido en un cliente (para probar la verificación sin
// depender del código aleatorio que normalmente se envía por correo).
export async function setOtpCliente(id_cliente, codigo, { minutos = 5, intentos = 0 } = {}) {
  const hash = await bcrypt.hash(String(codigo), 10);
  const expira = new Date(Date.now() + minutos * 60 * 1000);
  await pool.query(
    'UPDATE clientes SET otp_hash = ?, otp_expira = ?, otp_intentos = ? WHERE id_cliente = ?',
    [hash, expira, intentos, id_cliente]
  );
  return expira;
}

// Abre una sesión de cliente (portal o app): genera un sid, lo guarda en la
// ranura correspondiente y devuelve un token firmado válido (rol 'cliente').
// Sirve para probar los endpoints protegidos del portal.
export async function crearSesionCliente({ id_cliente, documento = '', origen = 'portal' } = {}) {
  const sid = crypto.randomBytes(16).toString('hex');
  const columna = origen === 'app' ? 'sesion_app' : 'sesion_portal';
  await pool.query(`UPDATE clientes SET ${columna} = ? WHERE id_cliente = ?`, [sid, id_cliente]);
  const token = jwt.sign(
    { id_cliente, rol: 'cliente', documento, origen, sid },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  return { token, sid };
}

// Lee los puntos acumulados actuales de un cliente.
export async function puntosDe(id_cliente) {
  const [filas] = await pool.query(
    'SELECT puntos_acumulados FROM clientes WHERE id_cliente = ?',
    [id_cliente]
  );
  return filas.length ? Number(filas[0].puntos_acumulados) : null;
}
