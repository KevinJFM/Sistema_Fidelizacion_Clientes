import bcrypt from 'bcryptjs';
import pool from '../configuracion/bd.js';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Máximo 2 administradores (id_rol = 1): dueño y encargado del hotel.
const ID_ROL_ADMIN = 1;
const MAX_ADMINS = 2;

// Cuenta administradores, opcionalmente excluyendo un id (al actualizar, para no contarse a sí mismo).
const contarAdmins = async (excluirId = null) => {
  const [filas] = await pool.query(
    excluirId != null
      ? 'SELECT COUNT(*) AS total FROM usuarios WHERE id_rol = ? AND id_usuario != ?'
      : 'SELECT COUNT(*) AS total FROM usuarios WHERE id_rol = ?',
    excluirId != null ? [ID_ROL_ADMIN, excluirId] : [ID_ROL_ADMIN]
  );
  return filas[0].total;
};

// Valida longitudes máximas de los campos presentes (crear/actualizar). Devuelve mensaje de error o null.
const validarLongitudes = ({ nombre, apellido, email, telefono }) => {
  if (nombre != null && String(nombre).length > 100) return 'El nombre es demasiado largo (máx. 100)';
  if (apellido != null && String(apellido).length > 100) return 'El apellido es demasiado largo (máx. 100)';
  if (email != null && String(email).length > 150) return 'El correo es demasiado largo (máx. 150)';
  if (telefono != null && String(telefono).length > 20) return 'El teléfono es demasiado largo (máx. 20)';
  return null;
};

// Valida la política de contraseñas. Devuelve null si es válida, o un mensaje de error.
const validarContrasena = (contrasena) => {
  if (contrasena.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  // bcrypt ignora los bytes después del 72, así que no tiene sentido permitir más.
  if (contrasena.length > 72) {
    return 'La contraseña es demasiado larga (máx. 72 caracteres)';
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

    const errorLongitud = validarLongitudes(req.body);
    if (errorLongitud) {
      return res.status(400).json({ message: errorLongitud });
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

    // Tope de seguridad: como máximo 2 administradores en todo el sistema
    if (Number(id_rol) === ID_ROL_ADMIN && (await contarAdmins()) >= MAX_ADMINS) {
      return res.status(409).json({
        message: `Solo se permiten ${MAX_ADMINS} administradores en el sistema. No es posible crear otra cuenta con rol de administrador.`,
      });
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

    // Validar longitudes máximas de los campos presentes
    const errorLongitud = validarLongitudes(req.body);
    if (errorLongitud) {
      return res.status(400).json({ message: errorLongitud });
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

    // Tope de seguridad: al promover a administrador, verificar que no se
    // superen los 2 admins permitidos (sin contar al propio usuario editado).
    if (Number(id_rol) === ID_ROL_ADMIN && (await contarAdmins(id)) >= MAX_ADMINS) {
      return res.status(409).json({
        message: `Solo se permiten ${MAX_ADMINS} administradores en el sistema. No es posible asignar el rol de administrador a otro usuario.`,
      });
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

// Borrado físico: refresh_tokens caen por CASCADE y la bitácora se desliga (id_usuario = NULL) para conservar auditoría. Si tiene transacciones, la FK lo impide y se avisa al front.
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
