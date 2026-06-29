import pool from '../configuracion/bd.js';

const ESTADO_INACTIVO = 2; // estados: 1=activo, 2=inactivo, 3=suspendido
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Listar todos los clientes
export const obtenerClientes = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.id_tipo_documento, c.numero_documento,
              c.nombres, c.apellidos, c.telefono, c.correo, c.fecha_nacimiento,
              c.puntos_acumulados, c.id_estado,
              td.nombre AS tipo_documento, e.estado, c.created_at
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       JOIN estados e          ON c.id_estado         = e.id_estado
       ORDER BY c.id_cliente DESC`
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
              c.puntos_acumulados, c.id_estado,
              td.nombre AS tipo_documento, e.estado
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       JOIN estados e          ON c.id_estado         = e.id_estado
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
    const { id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo, fecha_nacimiento } = req.body;

    if (!id_tipo_documento || !numero_documento || !nombres || !apellidos) {
      return res.status(400).json({ message: 'Tipo de documento, número, nombres y apellidos son requeridos' });
    }

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
        (id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo, fecha_nacimiento, puntos_acumulados, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [id_tipo_documento, numero_documento, nombres, apellidos, telefono ?? null, correo ?? null, fecha_nacimiento ?? null]
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
    const { id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo, fecha_nacimiento, id_estado } = req.body;

    const [existe] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

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
           telefono = ?, correo = ?, fecha_nacimiento = ?, id_estado = ?
       WHERE id_cliente = ?`,
      [id_tipo_documento, numero_documento, nombres, apellidos, telefono ?? null, correo ?? null, fecha_nacimiento ?? null, id_estado, id]
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
