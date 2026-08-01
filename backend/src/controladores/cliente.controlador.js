import pool from '../configuracion/bd.js';

const ESTADO_INACTIVO = 2; // estados: 1=activo, 2=inactivo, 3=suspendido
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Longitud máxima por campo (igual que las columnas de clientes); frena cuerpos enormes y basura.
const LIMITES_CLIENTE = { nombres: 100, apellidos: 100, numero_documento: 30, telefono: 20, correo: 150 };
const validarLongitudes = (datos) => {
  for (const [campo, max] of Object.entries(LIMITES_CLIENTE)) {
    const v = datos[campo];
    if (v != null && String(v).trim().length > max) {
      return `El campo "${campo}" no puede superar ${max} caracteres`;
    }
  }
  return null;
};

// Listar todos los clientes
export const obtenerClientes = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.id_tipo_documento, c.numero_documento,
              c.nombres, c.apellidos, c.telefono, c.correo, c.fecha_nacimiento,
              c.id_departamento, c.id_distrito, c.puntos_acumulados, c.id_estado,
              td.nombre AS tipo_documento, e.estado,
              dep.nombre AS departamento, dis.nombre AS distrito, c.created_at
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       JOIN estados e          ON c.id_estado         = e.id_estado
       LEFT JOIN departamentos dep ON c.id_departamento = dep.id_departamento
       LEFT JOIN distritos dis     ON c.id_distrito     = dis.id_distrito
       ORDER BY c.id_cliente DESC`
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Top 5 clientes con más puntos (para el dashboard)
export const getTopClientes = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.nombres, c.apellidos, c.puntos_acumulados,
              td.nombre AS tipo_documento, c.numero_documento
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE c.id_estado = 1
       ORDER BY c.puntos_acumulados DESC
       LIMIT 5`
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Buscar clientes por nombre o apellido (devuelve lista)
export const buscarClientesPorNombre = async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({ message: 'Ingresa al menos 2 caracteres' });
    }
    const t = `%${nombre.trim()}%`;
    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.id_tipo_documento, c.numero_documento,
              c.nombres, c.apellidos, c.telefono, c.puntos_acumulados,
              td.nombre AS tipo_documento
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE c.nombres LIKE ? OR c.apellidos LIKE ? OR CONCAT(c.nombres,' ',c.apellidos) LIKE ?
       ORDER BY c.nombres, c.apellidos
       LIMIT 20`,
      [t, t, t]
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Buscar cliente por tipo y número de documento (consulta rápida)
export const buscarClientePorDocumento = async (req, res) => {
  try {
    const { id_tipo_documento, numero_documento } = req.query;

    if (!id_tipo_documento || !numero_documento) {
      return res.status(400).json({ message: 'Tipo y número de documento son requeridos' });
    }

    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.id_tipo_documento, c.numero_documento,
              c.nombres, c.apellidos, c.telefono, c.correo, c.fecha_nacimiento,
              c.id_departamento, c.id_distrito, c.puntos_acumulados, c.id_estado,
              td.nombre AS tipo_documento, e.estado,
              dep.nombre AS departamento, dis.nombre AS distrito
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       JOIN estados e          ON c.id_estado         = e.id_estado
       LEFT JOIN departamentos dep ON c.id_departamento = dep.id_departamento
       LEFT JOIN distritos dis     ON c.id_distrito     = dis.id_distrito
       WHERE c.id_tipo_documento = ? AND c.numero_documento = ?`,
      [id_tipo_documento, numero_documento]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    return res.status(200).json(filas[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear cliente
export const crearCliente = async (req, res) => {
  try {
    const {
      id_tipo_documento, numero_documento, nombres, apellidos,
      telefono, correo, fecha_nacimiento, id_departamento, id_distrito,
    } = req.body;

    if (!id_tipo_documento || !numero_documento || !nombres || !apellidos || !id_departamento || !id_distrito) {
      return res.status(400).json({ message: 'Tipo de documento, número, nombres, apellidos, departamento y distrito son requeridos' });
    }

    const errLongitud = validarLongitudes(req.body);
    if (errLongitud) return res.status(400).json({ message: errLongitud });

    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no tiene un formato válido' });
    }

    const [existe] = await pool.query(
      'SELECT id_cliente FROM clientes WHERE id_tipo_documento = ? AND numero_documento = ?',
      [id_tipo_documento, numero_documento]
    );
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe un cliente con ese documento' });
    }

    const [resultado] = await pool.query(
      `INSERT INTO clientes
        (id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo,
         fecha_nacimiento, id_departamento, id_distrito, puntos_acumulados, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        id_tipo_documento, numero_documento, nombres, apellidos,
        telefono || null, correo || null, fecha_nacimiento || null,
        id_departamento ?? null, id_distrito ?? null,
      ]
    );

    return res.status(201).json({
      message: 'Cliente registrado correctamente',
      id_cliente: resultado.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar cliente
export const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_tipo_documento, numero_documento, nombres, apellidos,
      telefono, correo, fecha_nacimiento, id_departamento, id_distrito, id_estado,
    } = req.body;

    const [existe] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const errLongitud = validarLongitudes(req.body);
    if (errLongitud) return res.status(400).json({ message: errLongitud });

    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no tiene un formato válido' });
    }

    // El documento no debe chocar con el de otro cliente
    const [duplicado] = await pool.query(
      'SELECT id_cliente FROM clientes WHERE id_tipo_documento = ? AND numero_documento = ? AND id_cliente != ?',
      [id_tipo_documento, numero_documento, id]
    );
    if (duplicado.length > 0) {
      return res.status(409).json({ message: 'Otro cliente ya tiene ese documento' });
    }

    await pool.query(
      `UPDATE clientes
       SET id_tipo_documento = ?, numero_documento = ?, nombres = ?, apellidos = ?,
           telefono = ?, correo = ?, fecha_nacimiento = ?,
           id_departamento = ?, id_distrito = ?, id_estado = ?
       WHERE id_cliente = ?`,
      [
        id_tipo_documento, numero_documento, nombres, apellidos,
        telefono || null, correo || null, fecha_nacimiento || null,
        id_departamento ?? null, id_distrito ?? null, id_estado, id,
      ]
    );

    return res.status(200).json({ message: 'Cliente actualizado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Borrado lógico (cambia el estado a inactivo)
export const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [existe] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    await pool.query('UPDATE clientes SET id_estado = ? WHERE id_cliente = ?', [ESTADO_INACTIVO, id]);

    return res.status(200).json({ message: 'Cliente desactivado correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
