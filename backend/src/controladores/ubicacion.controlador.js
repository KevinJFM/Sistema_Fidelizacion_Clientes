import pool from '../configuracion/bd.js';

// Listar todos los departamentos
export const obtenerDepartamentos = async (req, res) => {
  try {
    const [filas] = await pool.query(
      'SELECT id_departamento, nombre FROM departamentos ORDER BY nombre'
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Listar los distritos de un departamento (a través de sus municipios)
export const obtenerDistritosPorDepartamento = async (req, res) => {
  try {
    const { id_departamento } = req.query;

    if (!id_departamento) {
      return res.status(400).json({ message: 'El departamento es requerido' });
    }

    const [filas] = await pool.query(
      `SELECT d.id_distrito, d.nombre
       FROM distritos d
       JOIN municipios m ON d.id_municipio = m.id_municipio
       WHERE m.id_departamento = ?
       ORDER BY d.nombre`,
      [id_departamento]
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
