import pool from '../configuracion/bd.js';

const ESTADO_ACTIVO = 1;
const ESTADO_INACTIVO = 2;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lee un valor de la tabla configuracion (con valor por defecto)
const obtenerConfig = async (clave, porDefecto) => {
  const [filas] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas.length ? filas[0].valor : porDefecto;
};

// ===================== CRUD de operadores =====================

// Listar todos los operadores
export const obtenerOperadores = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT o.id_operador, o.nombre, o.telefono, o.correo,
              o.puntos_acumulados, o.id_estado, e.estado, o.created_at
       FROM operadores_turisticos o
       JOIN estados e ON o.id_estado = e.id_estado
       ORDER BY o.id_operador DESC`
    );
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Crear un operador
export const crearOperador = async (req, res) => {
  try {
    const { nombre, telefono, correo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no es válido' });
    }
    const [resultado] = await pool.query(
      `INSERT INTO operadores_turisticos (nombre, telefono, correo, id_estado)
       VALUES (?, ?, ?, ?)`,
      [nombre.trim(), telefono || null, correo || null, ESTADO_ACTIVO]
    );
    return res.status(201).json({ message: 'Operador creado', id_operador: resultado.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar un operador
export const actualizarOperador = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, correo, id_estado } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no es válido' });
    }
    const [resultado] = await pool.query(
      `UPDATE operadores_turisticos
       SET nombre = ?, telefono = ?, correo = ?, id_estado = ?
       WHERE id_operador = ?`,
      [nombre.trim(), telefono || null, correo || null, id_estado || ESTADO_ACTIVO, id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ message: 'Operador no encontrado' });
    }
    return res.status(200).json({ message: 'Operador actualizado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Activar / desactivar un operador (baja lógica, conserva su historial)
export const cambiarEstadoOperador = async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await pool.query(
      'SELECT id_estado FROM operadores_turisticos WHERE id_operador = ?',
      [id]
    );
    if (filas.length === 0) {
      return res.status(404).json({ message: 'Operador no encontrado' });
    }
    const nuevoEstado = filas[0].id_estado === ESTADO_ACTIVO ? ESTADO_INACTIVO : ESTADO_ACTIVO;
    await pool.query(
      'UPDATE operadores_turisticos SET id_estado = ? WHERE id_operador = ?',
      [nuevoEstado, id]
    );
    return res.status(200).json({ message: 'Estado actualizado', id_estado: nuevoEstado });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ===================== Registro de consumo / puntos =====================

// Registrar un grupo del operador y otorgar puntos
// Puntos = (personas >= mínimo ? 1.5 x personas : 0) + tasa x (habitaciones + consumo)
export const registrarConsumoOperador = async (req, res) => {
  try {
    const { id_operador, num_personas, monto_habitaciones, monto_consumo } = req.body;
    const personas = Number(num_personas) || 0;
    const montoHab = Number(monto_habitaciones) || 0;
    const montoCon = Number(monto_consumo) || 0;

    if (!id_operador) {
      return res.status(400).json({ message: 'Operador requerido' });
    }
    if (personas <= 0 && montoHab <= 0 && montoCon <= 0) {
      return res.status(400).json({ message: 'Registra al menos personas o un monto' });
    }

    const [filasOp] = await pool.query(
      'SELECT * FROM operadores_turisticos WHERE id_operador = ?',
      [id_operador]
    );
    if (filasOp.length === 0) {
      return res.status(404).json({ message: 'Operador no encontrado' });
    }
    if (filasOp[0].id_estado !== ESTADO_ACTIVO) {
      return res.status(400).json({ message: 'El operador no está activo' });
    }

    // Reglas configurables
    const puntosPorPersona = Number(await obtenerConfig('operador_puntos_persona', '1.5'));
    const minPersonas      = Number(await obtenerConfig('operador_min_personas', '5'));
    const tasaHabConsumo   = Number(await obtenerConfig('operador_tasa_hab_consumo', '0.005'));

    // Cálculo de puntos
    const puntosPersonas = personas >= minPersonas ? puntosPorPersona * personas : 0;
    const puntosConsumo  = tasaHabConsumo * (montoHab + montoCon);
    const puntosOtorgados = Number((puntosPersonas + puntosConsumo).toFixed(2));

    const saldoFinal = Number(filasOp[0].puntos_acumulados) + puntosOtorgados;

    // Escritura atómica
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [resultado] = await conexion.query(
        `INSERT INTO transacciones_operador
          (id_operador, id_usuario, num_personas, monto_habitaciones, monto_consumo,
           puntos_personas, puntos_consumo, puntos_otorgados)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_operador, req.usuario.id_usuario, personas, montoHab, montoCon,
         puntosPersonas, puntosConsumo, puntosOtorgados]
      );
      await conexion.query(
        'UPDATE operadores_turisticos SET puntos_acumulados = ? WHERE id_operador = ?',
        [saldoFinal, id_operador]
      );
      await conexion.commit();

      return res.status(201).json({
        message: 'Consumo registrado correctamente',
        id_transaccion_op: resultado.insertId,
        puntos_personas: puntosPersonas,
        puntos_consumo: Number(puntosConsumo.toFixed(2)),
        puntos_otorgados: puntosOtorgados,
        saldo_puntos: Number(saldoFinal.toFixed(2)),
        alcanzo_minimo: personas >= minPersonas,
        minimo_personas: minPersonas,
      });
    } catch (e) {
      await conexion.rollback();
      throw e;
    } finally {
      conexion.release();
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// ===================== Historial =====================

// Listar el historial de consumos de operadores (con filtros)
export const listarTransaccionesOperador = async (req, res) => {
  try {
    const { id_operador, desde, hasta } = req.query;

    let sql = `
      SELECT t.id_transaccion_op, t.id_operador, t.num_personas,
             t.monto_habitaciones, t.monto_consumo,
             t.puntos_personas, t.puntos_consumo, t.puntos_otorgados,
             t.puntos_canjeados, t.descuento_aplicado, t.fecha,
             o.nombre AS operador, o.telefono, o.correo,
             u.nombre AS registrado_por
      FROM transacciones_operador t
      JOIN operadores_turisticos o ON t.id_operador = o.id_operador
      JOIN usuarios u              ON t.id_usuario  = u.id_usuario
      WHERE 1 = 1`;
    const parametros = [];

    if (id_operador) {
      sql += ' AND t.id_operador = ?';
      parametros.push(id_operador);
    }
    if (desde) {
      sql += ' AND t.fecha >= ?';
      parametros.push(desde);
    }
    if (hasta) {
      sql += ' AND t.fecha <= ?';
      parametros.push(`${hasta} 23:59:59`);
    }

    sql += ' ORDER BY t.id_transaccion_op DESC';

    const [filas] = await pool.query(sql, parametros);
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
