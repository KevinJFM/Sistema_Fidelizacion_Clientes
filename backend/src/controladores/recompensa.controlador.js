import pool from '../configuracion/bd.js';
import { VALOR_PUNTO } from '../configuracion/recompensas.js';

const conValor = (r) => ({ ...r, valor: Number((r.puntos * VALOR_PUNTO).toFixed(2)) });

// Lista activas (para el selector en transacciones y portal del cliente)
export const listarRecompensas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
    );
    return res.json(rows.map(conValor));
  } catch {
    return res.status(500).json({ message: 'Error al listar recompensas' });
  }
};

// Lista todas (activas e inactivas) para la pantalla de configuración
export const listarTodasRecompensas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM recompensas ORDER BY activo DESC, puntos ASC'
    );
    return res.json(rows.map(conValor));
  } catch {
    return res.status(500).json({ message: 'Error al listar recompensas' });
  }
};

export const crearRecompensa = async (req, res) => {
  try {
    const { nombre, tipo, puntos } = req.body;
    const tipoFinal = (tipo || 'Estándar').trim();
    const puntosNum = Number(puntos);
    if (!nombre?.trim() || !puntosNum || puntosNum <= 0 || puntosNum > 999999) {
      return res.status(400).json({ message: 'Nombre y puntos válidos (1–999999) son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO recompensas (nombre, tipo, puntos) VALUES (?, ?, ?)',
      [nombre.trim(), tipoFinal, puntosNum]
    );
    const [rows] = await pool.query('SELECT * FROM recompensas WHERE id = ?', [result.insertId]);
    return res.status(201).json(conValor(rows[0]));
  } catch {
    return res.status(500).json({ message: 'Error al crear recompensa' });
  }
};

export const actualizarRecompensa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, puntos, activo } = req.body;
    const tipoFinal = (tipo || 'Estándar').trim();
    const puntosNum = Number(puntos);
    if (!nombre?.trim() || !puntosNum || puntosNum <= 0 || puntosNum > 999999) {
      return res.status(400).json({ message: 'Nombre y puntos válidos (1–999999) son requeridos' });
    }
    const [existe] = await pool.query('SELECT id FROM recompensas WHERE id = ?', [id]);
    if (!existe.length) return res.status(404).json({ message: 'Recompensa no encontrada' });
    await pool.query(
      'UPDATE recompensas SET nombre = ?, tipo = ?, puntos = ?, activo = ? WHERE id = ?',
      [nombre.trim(), tipoFinal, puntosNum, activo !== undefined ? Number(activo) : 1, id]
    );
    const [rows] = await pool.query('SELECT * FROM recompensas WHERE id = ?', [id]);
    return res.json(conValor(rows[0]));
  } catch {
    return res.status(500).json({ message: 'Error al actualizar recompensa' });
  }
};

// Eliminación física de la recompensa
export const eliminarRecompensa = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM recompensas WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Recompensa no encontrada' });
    await pool.query('DELETE FROM recompensas WHERE id = ?', [id]);
    return res.json({ message: 'Recompensa eliminada correctamente' });
  } catch {
    return res.status(500).json({ message: 'Error al eliminar recompensa' });
  }
};
