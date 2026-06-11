import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const ESTADO_INACTIVO = 2; // estados: 1=activo, 2=inactivo, 3=suspendido

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida la política de contraseñas. Devuelve null si es válida, o un mensaje de error.
const validarContrasena = (contrasena) => {
  if (contrasena.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!/[A-Z]/.test(contrasena)) {
    return 'La contraseña debe incluir al menos una letra mayúscula';
  }
  if (!/[a-z]/.test(contrasena)) {
    return 'La contraseña debe incluir al menos una letra minúscula';
  }
  if (!/[0-9]/.test(contrasena)) {
    return 'La contraseña debe incluir al menos un número';
  }
  return null;
};

// Listar todos los usuarios
export const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
              u.fecha_nacimiento, u.id_rol, u.id_estado,
              r.rol, e.estado, u.created_at
       FROM usuarios u
       JOIN roles r   ON u.id_rol    = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       ORDER BY u.id_usuario DESC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener un usuario por id
export const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
              u.fecha_nacimiento, u.id_rol, u.id_estado,
              r.rol, e.estado, u.created_at
       FROM usuarios u
       JOIN roles r   ON u.id_rol    = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       WHERE u.id_usuario = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear usuario
export const createUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, contrasena, telefono, fecha_nacimiento, id_rol } = req.body;

    if (!nombre || !apellido || !email || !contrasena || !telefono || !fecha_nacimiento || !id_rol) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido' });
    }

    const errorPass = validarContrasena(contrasena);
    if (errorPass) {
      return res.status(400).json({ message: errorPass });
    }

    const [existing] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const contrasena_hash = await bcrypt.hash(contrasena, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento, id_rol]
    );

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      id_usuario: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar usuario
export const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, fecha_nacimiento, id_rol, id_estado, contrasena } = req.body;

    const [existing] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar formato del email
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido' });
    }

    // Verificar que el email no esté en uso por otro usuario
    if (email) {
      const [dup] = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?',
        [email, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({ message: 'El email ya está en uso por otro usuario' });
      }
    }

    await pool.query(
      `UPDATE usuarios
       SET nombre = ?, apellido = ?, email = ?, telefono = ?,
           fecha_nacimiento = ?, id_rol = ?, id_estado = ?
       WHERE id_usuario = ?`,
      [nombre, apellido, email, telefono, fecha_nacimiento, id_rol, id_estado, id]
    );

    // Si se envió contraseña, validarla y actualizarla por separado
    if (contrasena) {
      const errorPass = validarContrasena(contrasena);
      if (errorPass) {
        return res.status(400).json({ message: errorPass });
      }
      const contrasena_hash = await bcrypt.hash(contrasena, 10);
      await pool.query(
        'UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?',
        [contrasena_hash, id]
      );
    }

    return res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Borrado lógico (cambia el estado a inactivo)
export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await pool.query(
      'UPDATE usuarios SET id_estado = ? WHERE id_usuario = ?',
      [ESTADO_INACTIVO, id]
    );

    return res.status(200).json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
