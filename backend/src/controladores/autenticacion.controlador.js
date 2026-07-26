import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../configuracion/bd.js';

// ===== Helpers de tokens =====
const firmarTokenAcceso = (usuario) =>
  jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const firmarTokenRefresco = (usuario) =>
  jwt.sign(
    { id_usuario: usuario.id_usuario },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN }
  );

const esProduccion = process.env.NODE_ENV === 'production';

// Opciones de la cookie del refresh token
const opcionesCookieRefresco = {
  httpOnly: true,                          // JavaScript no puede leerla (protege de XSS)
  secure: esProduccion,                    // solo viaja por HTTPS en producción
  sameSite: esProduccion ? 'none' : 'lax', // 'none' permite dominios distintos (front/api)
  path: '/api/auth',                       // solo se envía a las rutas de auth
  maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 días
};

// ===== Revocación de refresh tokens (tabla refresh_tokens) =====
// Se guarda solo el HASH del token, nunca el token en claro.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Registra un refresh token emitido (para poder revocarlo luego)
const guardarRefresh = async (idUsuario, token, req) => {
  const datos = jwt.decode(token);
  const expira = new Date((datos?.exp ?? Math.floor(Date.now() / 1000) + 7 * 24 * 3600) * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (id_usuario, token_hash, user_agent, ip, expira_en)
     VALUES (?, ?, ?, ?, ?)`,
    [idUsuario, hashToken(token), String(req.headers['user-agent'] || '').slice(0, 255), req.ip || null, expira]
  );
};

// Marca un refresh token como revocado (logout o rotación)
const revocarRefresh = async (token) => {
  await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [hashToken(token)]);
};

// ¿El refresh token sigue vigente? (existe, no revocado y no expirado)
const refreshVigente = async (token) => {
  const [filas] = await pool.query(
    'SELECT id_token FROM refresh_tokens WHERE token_hash = ? AND revocado = 0 AND expira_en > NOW() LIMIT 1',
    [hashToken(token)]
  );
  return filas.length > 0;
};

// Datos públicos del usuario que se mandan al frontend
const datosPublicosUsuario = (u) => ({
  id_usuario: u.id_usuario,
  nombre: u.nombre,
  apellido: u.apellido,
  email: u.email,
  rol: u.rol,
});

export const iniciarSesion = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const [filas] = await pool.query(
      `SELECT u.*, r.rol, e.estado
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       WHERE u.email = ?`,
      [email]
    );

    if (filas.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = filas[0];

    if (usuario.estado !== 'activo') {
      return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const tokenAcceso   = firmarTokenAcceso(usuario);
    const tokenRefresco = firmarTokenRefresco(usuario);

    await guardarRefresh(usuario.id_usuario, tokenRefresco, req); // registrar para poder revocarlo
    res.cookie('refreshToken', tokenRefresco, opcionesCookieRefresco);

    return res.status(200).json({
      message: 'Login exitoso',
      token: tokenAcceso,
      usuario: datosPublicosUsuario(usuario),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Renueva el access token usando el refresh token de la cookie
export const renovarToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No hay sesión activa' });
    }

    let datosToken;
    try {
      datosToken = jwt.verify(token, process.env.REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Sesión expirada' });
    }

    // El token debe seguir vigente en BD (no revocado por logout ni rotado)
    if (!(await refreshVigente(token))) {
      return res.status(401).json({ message: 'Sesión expirada' });
    }

    // Re-consultamos el usuario para datos frescos y validar su estado actual
    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, r.rol, e.estado
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       WHERE u.id_usuario = ?`,
      [datosToken.id_usuario]
    );

    if (filas.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const usuario = filas[0];
    if (usuario.estado !== 'activo') {
      return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
    }

    // Rotación: revocamos el anterior y emitimos uno nuevo (uno-a-uno)
    const tokenAcceso       = firmarTokenAcceso(usuario);
    const nuevoTokenRefresco = firmarTokenRefresco(usuario);
    await revocarRefresh(token);                                        // invalida el token usado
    await guardarRefresh(usuario.id_usuario, nuevoTokenRefresco, req);  // registra el nuevo
    res.cookie('refreshToken', nuevoTokenRefresco, opcionesCookieRefresco);

    return res.status(200).json({
      token: tokenAcceso,
      usuario: datosPublicosUsuario(usuario),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const cerrarSesion = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try { await revocarRefresh(token); } catch { /* si falla, igual borramos la cookie */ }
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: esProduccion,
    sameSite: esProduccion ? 'none' : 'lax',
    path: '/api/auth',
  });
  return res.status(200).json({ message: 'Sesión cerrada' });
};

export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, contrasena, telefono, fecha_nacimiento, id_rol } = req.body;

    if (!nombre || !apellido || !email || !contrasena || !telefono || !fecha_nacimiento) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Longitud máxima (columnas de la tabla usuarios). La contraseña se limita a 72
    // porque bcrypt ignora los bytes posteriores.
    if (String(nombre).length > 100 || String(apellido).length > 100) {
      return res.status(400).json({ message: 'Nombre o apellido demasiado largo (máx. 100)' });
    }
    if (String(email).length > 150) {
      return res.status(400).json({ message: 'El correo es demasiado largo (máx. 150)' });
    }
    if (String(telefono).length > 20) {
      return res.status(400).json({ message: 'El teléfono es demasiado largo (máx. 20)' });
    }
    if (String(contrasena).length > 72) {
      return res.status(400).json({ message: 'La contraseña es demasiado larga (máx. 72 caracteres)' });
    }

    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (existe.length > 0) {
      return res.status(409).json({ message: 'Usuario ya registrado' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [nombre, apellido, email, contrasenaHash, telefono, fecha_nacimiento, id_rol ?? 3]
    );

    return res.status(201).json({ message: 'Usuario creado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
