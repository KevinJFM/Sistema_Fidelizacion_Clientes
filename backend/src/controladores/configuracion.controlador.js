import pool from '../configuracion/bd.js';

// Listar toda la configuración
export const obtenerConfiguracion = async (req, res) => {
  try {
    const [filas] = await pool.query(
      'SELECT id_config, clave, valor, descripcion FROM configuracion ORDER BY id_config'
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar varios valores. Espera un objeto { clave: valor, ... }
export const actualizarConfiguracion = async (req, res) => {
  try {
    const valores = req.body;
    const claves = Object.keys(valores || {});

    if (claves.length === 0) {
      return res.status(400).json({ message: 'No hay valores para actualizar' });
    }

    // Validar que ningún valor venga vacío o negativo
    for (const clave of claves) {
      const v = valores[clave];
      if (v === '' || v === null || v === undefined || Number(v) < 0) {
        return res.status(400).json({ message: `Valor inválido para "${clave}"` });
      }
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      for (const clave of claves) {
        await conexion.query(
          'UPDATE configuracion SET valor = ? WHERE clave = ?',
          [String(valores[clave]), clave]
        );
      }
      await conexion.commit();
    } catch (e) {
      await conexion.rollback();
      throw e;
    } finally {
      conexion.release();
    }

    return res.status(200).json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
