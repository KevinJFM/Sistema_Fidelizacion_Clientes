import pool from '../configuracion/bd.js';
import { notificarPromosDeHoy } from '../tareas/promociones.tarea.js';

export const obtenerPromociones = async (req, res) => {
  try {
    // El estado se calcula al momento (según el día de hoy y las fechas), así nunca queda desactualizado.
    const [rows] = await pool.query(
      `SELECT *,
              CASE
                WHEN activo = 0 THEN 'inactivo'
                WHEN fecha_especial IS NOT NULL THEN
                  CASE
                    WHEN fecha_especial = CURDATE() THEN 'activo-hoy'
                    WHEN fecha_especial > CURDATE() THEN 'programada'
                    ELSE 'finalizada'
                  END
                WHEN fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL THEN
                  CASE
                    WHEN CURDATE() < fecha_inicio THEN 'programada'
                    WHEN CURDATE() > fecha_fin THEN 'finalizada'
                    ELSE 'activo-hoy'
                  END
                ELSE 'programada'
              END AS estado
       FROM promociones
       ORDER BY id_escenario DESC`
    );
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const crearPromocion = async (req, res) => {
  try {
    const { nombre, fecha_inicio, fecha_fin, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre de la promoción es requerido' });
    }

    if (!fecha_especial && !fecha_inicio && !fecha_fin) {
      return res.status(400).json({ message: 'Debe indicar al menos una fecha especial o un rango inicio–fin' });
    }

    if ((fecha_inicio && !fecha_fin) || (!fecha_inicio && fecha_fin)) {
      return res.status(400).json({ message: 'Si usa rango de fechas, debe indicar tanto fecha inicio como fecha fin' });
    }

    if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
      return res.status(400).json({ message: 'La fecha fin no puede ser menor que la fecha inicio' });
    }

    const [result] = await pool.query(
      `INSERT INTO promociones
        (nombre, fecha_inicio, fecha_fin, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        fecha_inicio || null,
        fecha_fin || null,
        fecha_especial || null,
        Number(puntos_extra) || 0,
        Number(descuento_extra) || 0,
        Number(max_usos_cliente) || 1,
        activo !== undefined ? (activo ? 1 : 0) : 1,
      ]
    );

    // Si la promo arranca hoy y está activa, avisar en el momento a los clientes con la app.
    // Va aparte para que un fallo de notificaciones nunca rompa la creación de la promoción.
    try {
      await notificarPromosDeHoy({ soloId: result.insertId });
    } catch {
      // Silencioso: si falla el envío de notificaciones, la promoción igual queda creada.
    }

    return res.status(201).json({ message: 'Promoción creada correctamente', id_escenario: result.insertId });
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const actualizarPromocion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fecha_inicio, fecha_fin, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo } = req.body;

    const [existing] = await pool.query('SELECT id_escenario FROM promociones WHERE id_escenario = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre de la promoción es requerido' });
    }

    if (!fecha_especial && !fecha_inicio && !fecha_fin) {
      return res.status(400).json({ message: 'Debe indicar al menos una fecha especial o un rango inicio–fin' });
    }

    if ((fecha_inicio && !fecha_fin) || (!fecha_inicio && fecha_fin)) {
      return res.status(400).json({ message: 'Si usa rango de fechas, debe indicar tanto fecha inicio como fecha fin' });
    }

    if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
      return res.status(400).json({ message: 'La fecha fin no puede ser menor que la fecha inicio' });
    }

    await pool.query(
      `UPDATE promociones
       SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, fecha_especial = ?,
           puntos_extra = ?, descuento_extra = ?, max_usos_cliente = ?, activo = ?
       WHERE id_escenario = ?`,
      [
        nombre.trim(),
        fecha_inicio || null,
        fecha_fin || null,
        fecha_especial || null,
        Number(puntos_extra) || 0,
        Number(descuento_extra) || 0,
        Number(max_usos_cliente) || 1,
        activo ? 1 : 0,
        id,
      ]
    );

    return res.status(200).json({ message: 'Promoción actualizada correctamente' });
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const togglePromocion = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT activo FROM promociones WHERE id_escenario = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const nuevoEstado = existing[0].activo ? 0 : 1;
    await pool.query('UPDATE promociones SET activo = ? WHERE id_escenario = ?', [nuevoEstado, id]);

    return res.status(200).json({
      message: nuevoEstado ? 'Promoción activada' : 'Promoción desactivada',
      activo: nuevoEstado,
    });
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const eliminarPromocion = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id_escenario FROM promociones WHERE id_escenario = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Promoción no encontrada' });
    }

    const [trans] = await pool.query('SELECT COUNT(*) AS total FROM transacciones WHERE id_escenario = ?', [id]);
    if (trans[0].total > 0) {
      return res.status(409).json({ message: 'No se puede eliminar: la promoción tiene transacciones asociadas' });
    }

    await pool.query('DELETE FROM promociones WHERE id_escenario = ?', [id]);
    return res.status(200).json({ message: 'Promoción eliminada correctamente' });
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
