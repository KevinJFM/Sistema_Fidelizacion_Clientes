import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

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

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
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
