import bcrypt from 'bcryptjs';
import pool from '../configuracion/bd.js';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
export const obtenerUsuarios = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
              u.fecha_nacimiento, u.id_departamento, u.id_distrito, u.id_rol, u.id_estado,
              r.rol, e.estado, dep.nombre AS departamento, dis.nombre AS distrito, u.created_at
       FROM usuarios u
       JOIN roles r   ON u.id_rol    = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       LEFT JOIN departamentos dep ON u.id_departamento = dep.id_departamento
       LEFT JOIN distritos dis     ON u.id_distrito     = dis.id_distrito
       ORDER BY u.id_usuario DESC`
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener un usuario por id
export const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
              u.fecha_nacimiento, u.id_departamento, u.id_distrito, u.id_rol, u.id_estado,
              r.rol, e.estado, dep.nombre AS departamento, dis.nombre AS distrito, u.created_at
       FROM usuarios u
       JOIN roles r   ON u.id_rol    = r.id_rol
       JOIN estados e ON u.id_estado = e.id_estado
       LEFT JOIN departamentos dep ON u.id_departamento = dep.id_departamento
       LEFT JOIN distritos dis     ON u.id_distrito     = dis.id_distrito
       WHERE u.id_usuario = ?`,
      [id]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json(filas[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear usuario
export const crearUsuario = async (req, res) => {
  try {
    const {
      nombre, apellido, email, contrasena, telefono,
      fecha_nacimiento, id_departamento, id_distrito, id_rol,
    } = req.body;

    if (!nombre || !apellido || !email || !contrasena || !telefono || !id_rol || !id_departamento || !id_distrito) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    if (!REGEX_CORREO.test(email)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido' });
    }

    const errorContrasena = validarContrasena(contrasena);
    if (errorContrasena) {
      return res.status(400).json({ message: errorContrasena });
    }

    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    const [resultado] = await pool.query(
      `INSERT INTO usuarios
        (nombre, apellido, email, contrasena_hash, telefono, fecha_nacimiento,
         id_departamento, id_distrito, id_rol, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        nombre, apellido, email, contrasenaHash, telefono, fecha_nacimiento || null,
        id_departamento ?? null, id_distrito ?? null, id_rol,
      ]
    );

    return res.status(201).json({
      message: 'Usuario creado correctamente',
      id_usuario: resultado.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar usuario
export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, apellido, email, telefono, fecha_nacimiento,
      id_departamento, id_distrito, id_rol, id_estado, contrasena,
    } = req.body;

    const [existe] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar formato del email
    if (email && !REGEX_CORREO.test(email)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido' });
    }

    // Verificar que el email no esté en uso por otro usuario
    if (email) {
      const [duplicado] = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE email = ? AND id_usuario != ?',
        [email, id]
      );
      if (duplicado.length > 0) {
        return res.status(409).json({ message: 'El email ya está en uso por otro usuario' });
      }
    }

    await pool.query(
      `UPDATE usuarios
       SET nombre = ?, apellido = ?, email = ?, telefono = ?, fecha_nacimiento = ?,
           id_departamento = ?, id_distrito = ?, id_rol = ?, id_estado = ?
       WHERE id_usuario = ?`,
      [
        nombre, apellido, email, telefono, fecha_nacimiento || null,
        id_departamento ?? null, id_distrito ?? null, id_rol, id_estado, id,
      ]
    );

    // Si se envió contraseña, validarla y actualizarla por separado
    if (contrasena) {
      const errorContrasena = validarContrasena(contrasena);
      if (errorContrasena) {
        return res.status(400).json({ message: errorContrasena });
      }
      const contrasenaHash = await bcrypt.hash(contrasena, 10);
      await pool.query(
        'UPDATE usuarios SET contrasena_hash = ? WHERE id_usuario = ?',
        [contrasenaHash, id]
      );
    }

    return res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Borrado físico: elimina el usuario por completo de la base de datos.
// Los refresh_tokens caen solos (ON DELETE CASCADE) y la bitácora se desliga
// (id_usuario = NULL) para conservar el historial de auditoría. Si el usuario
// tiene transacciones registradas, la FK lo impide y se avisa al front.
export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  const conexion = await pool.getConnection();
  try {
    const [existe] = await conexion.query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await conexion.beginTransaction();
    // Conservar la auditoría pero desligarla del usuario que se elimina
    await conexion.query('UPDATE bitacora SET id_usuario = NULL WHERE id_usuario = ?', [id]);
    await conexion.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    await conexion.commit();

    return res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    await conexion.rollback();
    // El usuario tiene transacciones asociadas (RESTRICT): no se puede borrar
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(409).json({
        message: 'No se puede eliminar: el usuario tiene transacciones registradas. Desactívalo en su lugar.',
      });
    }
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conexion.release();
  }
};
