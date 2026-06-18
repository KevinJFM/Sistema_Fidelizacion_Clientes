import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// ===== Helpers de tokens =====
const signAccessToken = (usuario) =>
  jwt.sign(
    { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

const signRefreshToken = (usuario) =>
  jwt.sign(
    { id_usuario: usuario.id_usuario },
    process.env.REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN }
  );

const isProd = process.env.NODE_ENV === 'production';

// Opciones de la cookie del refresh token
const refreshCookieOptions = {
  httpOnly: true,                       // JavaScript no puede leerla (protege de XSS)
  secure: isProd,                       // solo viaja por HTTPS en producción
  sameSite: isProd ? 'none' : 'lax',    // 'none' permite dominios distintos (front/api)
  path: '/api/auth',                    // solo se envía a las rutas de auth
  maxAge: 7 * 24 * 60 * 60 * 1000,      // 7 días
};

// Datos públicos del usuario que se mandan al frontend
const usuarioPublico = (u) => ({
  id_usuario: u.id_usuario,
  nombre: u.nombre,
  apellido: u.apellido,
  email: u.email,
  rol: u.rol,
});

export const loginUser = async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    if (!email || !contrasena) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, r.rol, e.estado
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    if (usuario.estado !== 'activo') {
      return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
    }

    const passwordValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const accessToken  = signAccessToken(usuario);
    const refreshToken = signRefreshToken(usuario);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return res.status(200).json({
      message: 'Login exitoso',
      token: accessToken,
      usuario: usuarioPublico(usuario),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Renueva el access token usando el refresh token de la cookie
export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No hay sesión activa' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Sesión expirada' });
    }

    // Re-consultamos el usuario para datos frescos y validar su estado actual
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, r.rol, e.estado
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       WHERE u.id_usuario = ?`,
      [payload.id_usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const usuario = rows[0];
    if (usuario.estado !== 'activo') {
      return res.status(403).json({ message: 'Usuario inactivo o suspendido' });
    }

    // Rotación: emitimos un refresh token nuevo en cada renovación
    const accessToken     = signAccessToken(usuario);
    const newRefreshToken = signRefreshToken(usuario);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    return res.status(200).json({
      token: accessToken,
      usuario: usuarioPublico(usuario),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
  return res.status(200).json({ message: 'Sesión cerrada' });
};

export const registerUser = async (req, res) => {
  try {
    const { nombre, apellido, email, contrasena, telefono, fecha_nacimiento, id_rol } = req.body;

    if (!nombre || !apellido || !email || !contrasena || !telefono || !fecha_nacimiento) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Usuario ya registrado' });
    }

    const contrasena_hash = await bcrypt.hash(contrasena, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol ?? 3]
    );

    return res.status(201).json({ message: 'Usuario creado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
