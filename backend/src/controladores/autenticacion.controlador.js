import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../configuracion/bd.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

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

    // Guardar el refresh token hasheado para permitir revocación
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (id_usuario, token_hash, user_agent, ip, expira_en) VALUES (?, ?, ?, ?, ?)',
      [usuario.id_usuario, hashToken(tokenRefresco), req.get('User-Agent') ?? null, req.ip ?? null, expira]
    );

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
      datosToken = jwt.verify(token, process.env.REFRESH_SECRET, { algorithms: ['HS256'] });
    } catch {
      return res.status(401).json({ message: 'Sesión expirada' });
    }

    // Verificar que el token no esté revocado ni sea desconocido
    const [filaToken] = await pool.query(
      'SELECT id_token FROM refresh_tokens WHERE token_hash = ? AND revocado = 0 AND expira_en > NOW() LIMIT 1',
      [hashToken(token)]
    );
    if (!filaToken.length) {
      return res.status(401).json({ message: 'Sesión inválida o revocada' });
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

    // Rotación: revocar el token actual y emitir uno nuevo
    const tokenAcceso        = firmarTokenAcceso(usuario);
    const nuevoTokenRefresco = firmarTokenRefresco(usuario);

    await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [hashToken(token)]);
    const nuevaExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (id_usuario, token_hash, user_agent, ip, expira_en) VALUES (?, ?, ?, ?, ?)',
      [usuario.id_usuario, hashToken(nuevoTokenRefresco), req.get('User-Agent') ?? null, req.ip ?? null, nuevaExpira]
    );

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
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [hashToken(token)]);
    }
  } catch { /* el cookie se borra igual */ }

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
    if ([nombre, apellido, email, telefono].some((v) => String(v).length > 200)) {
      return res.status(400).json({ message: 'Uno o más campos exceden la longitud permitida' });
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
