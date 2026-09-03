import pool from '../configuracion/bd.js';
import { enviarBienvenidaOperador, enviarComprobanteOperador } from '../configuracion/correo.js';

const ESTADO_ACTIVO = 1;
const ESTADO_INACTIVO = 2;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regla fija: el operador gana puntos por visita solo si trae el mínimo de personas; si trae menos, se registra sin puntos.
const PUNTOS_POR_VISITA = 100;
const MINIMO_PERSONAS = 12;

// ===================== CRUD de operadores =====================

// Listar todos los operadores
export const obtenerOperadores = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT o.id_operador, o.nombre, o.tipo, o.telefono, o.pais, o.correo,
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
    const { nombre, tipo, telefono, pais, correo } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no es válido' });
    }
    const tipoNorm = tipo === 'Empresa' ? 'Empresa' : 'Persona natural';
    const [resultado] = await pool.query(
      `INSERT INTO operadores_turisticos (nombre, tipo, telefono, pais, correo, id_estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), tipoNorm, telefono || null, pais || 'El Salvador', correo || null, ESTADO_ACTIVO]
    );

    // Correo de bienvenida (si tiene correo y la plantilla está activa). No bloquea la respuesta.
    if (correo) {
      enviarBienvenidaOperador({ destino: correo, nombre: nombre.trim() }).catch(() => {});
    }

    return res.status(201).json({ message: 'Operador creado', id_operador: resultado.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actualizar un operador
export const actualizarOperador = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, telefono, pais, correo, id_estado } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }
    if (correo && !REGEX_CORREO.test(correo)) {
      return res.status(400).json({ message: 'El correo no es válido' });
    }
    const tipoNorm = tipo === 'Empresa' ? 'Empresa' : 'Persona natural';
    const [resultado] = await pool.query(
      `UPDATE operadores_turisticos
       SET nombre = ?, tipo = ?, telefono = ?, pais = ?, correo = ?, id_estado = ?
       WHERE id_operador = ?`,
      [nombre.trim(), tipoNorm, telefono || null, pais || 'El Salvador', correo || null, id_estado || ESTADO_ACTIVO, id]
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

// Registrar una visita del operador y otorgar puntos (100 fijos por visita)
export const registrarConsumoOperador = async (req, res) => {
  try {
    const { id_operador, num_personas } = req.body;
    const personas = Number(num_personas) || 0;

    if (!id_operador) {
      return res.status(400).json({ message: 'Operador requerido' });
    }
    if (personas <= 0) {
      return res.status(400).json({ message: 'Ingresa la cantidad de personas' });
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

    // 100 puntos por visita solo si trae el mínimo de personas; si no, se registra sin puntos.
    const otorgaPuntos = personas >= MINIMO_PERSONAS;
    const puntosOtorgados = otorgaPuntos ? PUNTOS_POR_VISITA : 0;
    const saldoFinal = Number(filasOp[0].puntos_acumulados) + puntosOtorgados;

    // Escritura atómica
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [resultado] = await conexion.query(
        `INSERT INTO transacciones_operador
          (id_operador, id_usuario, num_personas, puntos_personas, puntos_otorgados)
         VALUES (?, ?, ?, ?, ?)`,
        [id_operador, req.usuario.id_usuario, personas, puntosOtorgados, puntosOtorgados]
      );
      await conexion.query(
        'UPDATE operadores_turisticos SET puntos_acumulados = ? WHERE id_operador = ?',
        [saldoFinal, id_operador]
      );
      await conexion.commit();

      // Comprobante por correo (si el operador tiene correo y la plantilla está activa). No bloquea la respuesta.
      if (filasOp[0].correo) {
        enviarComprobanteOperador({
          destino: filasOp[0].correo,
          nombre: filasOp[0].nombre,
          tipo: 'visita',
          personas,
          puntosGanados: puntosOtorgados,
          otorgaPuntos,
          minimo: MINIMO_PERSONAS,
          saldo: saldoFinal,
        }).catch(() => {});
      }

      return res.status(201).json({
        message: otorgaPuntos
          ? 'Visita registrada correctamente'
          : `Visita registrada. No se otorgaron puntos: se requieren mínimo ${MINIMO_PERSONAS} personas.`,
        id_transaccion_op: resultado.insertId,
        puntos_otorgados: puntosOtorgados,
        otorga_puntos: otorgaPuntos,
        minimo_personas: MINIMO_PERSONAS,
        saldo_puntos: Number(saldoFinal.toFixed(2)),
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

// ===================== Canje de puntos =====================

// El operador canjea puntos por una recompensa: se restan los puntos del premio, sin otorgar puntos ni descuento.
export const canjearOperador = async (req, res) => {
  try {
    const { id_operador, id_recompensa } = req.body;

    if (!id_operador || !id_recompensa) {
      return res.status(400).json({ message: 'Operador y recompensa requeridos' });
    }

    const [filasR] = await pool.query(
      'SELECT id, nombre, tipo, puntos FROM recompensas WHERE id = ? AND activo = 1',
      [Number(id_recompensa)]
    );
    if (!filasR.length) {
      return res.status(400).json({ message: 'Recompensa no válida' });
    }
    const recompensa = filasR[0];

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
    if (Number(filasOp[0].puntos_acumulados) < recompensa.puntos) {
      return res.status(400).json({ message: 'El operador no tiene puntos suficientes para esa recompensa' });
    }

    const saldoFinal = Number(filasOp[0].puntos_acumulados) - recompensa.puntos;

    // Escritura atómica: registra el canje y resta los puntos
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [resultado] = await conexion.query(
        `INSERT INTO transacciones_operador
          (id_operador, id_usuario, num_personas, puntos_personas, puntos_otorgados, puntos_canjeados)
         VALUES (?, ?, 0, 0, 0, ?)`,
        [id_operador, req.usuario.id_usuario, recompensa.puntos]
      );
      await conexion.query(
        'UPDATE operadores_turisticos SET puntos_acumulados = ? WHERE id_operador = ?',
        [saldoFinal, id_operador]
      );
      await conexion.commit();

      // Comprobante del canje por correo (si el operador tiene correo y la plantilla está activa). No bloquea la respuesta.
      if (filasOp[0].correo) {
        enviarComprobanteOperador({
          destino: filasOp[0].correo,
          nombre: filasOp[0].nombre,
          tipo: 'canje',
          recompensa: recompensa.nombre,
          puntosCanjeados: recompensa.puntos,
          saldo: saldoFinal,
        }).catch(() => {});
      }

      return res.status(201).json({
        message: 'Canje registrado correctamente',
        id_transaccion_op: resultado.insertId,
        recompensa: recompensa.nombre,
        puntos_canjeados: recompensa.puntos,
        saldo_puntos: Number(saldoFinal.toFixed(2)),
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
    const { id_operador, tipo, desde, hasta } = req.query;

    let sql = `
      SELECT t.id_transaccion_op, t.id_operador, t.num_personas,
             t.puntos_personas, t.puntos_otorgados,
             t.puntos_canjeados, t.descuento_aplicado, t.fecha,
             t.anulada, t.anulada_en, t.motivo_anulacion,
             o.nombre AS operador, o.tipo, o.telefono, o.pais, o.correo,
             u.nombre AS registrado_por,
             ua.nombre AS anulada_por
      FROM transacciones_operador t
      JOIN operadores_turisticos o ON t.id_operador = o.id_operador
      JOIN usuarios u              ON t.id_usuario  = u.id_usuario
      LEFT JOIN usuarios ua        ON t.anulada_por = ua.id_usuario
      WHERE 1 = 1`;
    const parametros = [];

    if (id_operador) {
      sql += ' AND t.id_operador = ?';
      parametros.push(id_operador);
    }
    // Filtro por tipo de operador (Persona natural / Empresa)
    if (tipo) {
      sql += ' AND o.tipo = ?';
      parametros.push(tipo);
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

// Anular un registro de operador: revierte los puntos (le quita lo otorgado y le devuelve lo
// canjeado), lo marca como anulado (quién/cuándo/por qué) y lo deja fuera de los totales. NO se
// borra: queda como rastro. Útil si el recepcionista se equivocó con el número de personas.
// Atómico y con la fila del operador bloqueada, igual que al anular una transacción de cliente.
export const anularTransaccionOperador = async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Registro no válido' });

    const motivo = (req.body?.motivo || '').trim();
    if (!motivo) return res.status(400).json({ message: 'El motivo de anulación es obligatorio' });

    await conexion.beginTransaction();

    // Bloquea el registro y relee su estado dentro de la transacción SQL.
    const [filas] = await conexion.query(
      'SELECT id_operador, puntos_otorgados, puntos_canjeados, anulada FROM transacciones_operador WHERE id_transaccion_op = ? FOR UPDATE',
      [id]
    );
    if (filas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    const t = filas[0];
    if (t.anulada) {
      await conexion.rollback();
      return res.status(400).json({ message: 'El registro ya está anulado' });
    }

    // Reversión: deshace lo que hizo (sumó otorgados, restó canjeados). Delta = -otorgados + canjeados.
    const delta = -Number(t.puntos_otorgados) + Number(t.puntos_canjeados);

    // Saldo bloqueado del operador hasta el commit.
    const [filasOp] = await conexion.query(
      'SELECT puntos_acumulados FROM operadores_turisticos WHERE id_operador = ? FOR UPDATE',
      [t.id_operador]
    );
    const saldoActual = Number(filasOp[0].puntos_acumulados);
    const saldoFinal = saldoActual + delta;

    // Integridad: no dejamos el saldo negativo (pasa si ya gastó parte de esos puntos).
    if (saldoFinal < 0) {
      await conexion.rollback();
      return res.status(400).json({
        message: 'No se puede anular: el operador ya usó parte de esos puntos (el saldo quedaría negativo).',
      });
    }

    // Marca el registro como anulado (con auditoría).
    await conexion.query(
      'UPDATE transacciones_operador SET anulada = 1, anulada_por = ?, anulada_en = NOW(), motivo_anulacion = ? WHERE id_transaccion_op = ?',
      [req.usuario.id_usuario, motivo, id]
    );

    // Aplica la reversión al saldo (relativa, sobre la fila bloqueada).
    await conexion.query(
      'UPDATE operadores_turisticos SET puntos_acumulados = puntos_acumulados + ? WHERE id_operador = ?',
      [delta, t.id_operador]
    );

    // Bitácora de auditoría.
    await conexion.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad, id_registro, detalle, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id_usuario, 'anular', 'transaccion_operador', id, `Motivo: ${motivo}`.slice(0, 255), req.ip || null]
    );

    await conexion.commit();
    return res.status(200).json({ message: 'Registro anulado correctamente', saldo_puntos: Number(saldoFinal.toFixed(2)) });
  } catch (error) {
    await conexion.rollback();
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conexion.release();
  }
};
