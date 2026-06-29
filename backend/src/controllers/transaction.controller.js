import pool from '../config/db.js';

// Lee un valor de la tabla configuracion (con valor por defecto)
const getConfigValor = async (clave, fallback) => {
  const [rows] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return rows.length ? rows[0].valor : fallback;
};

// Registrar una transacción (otorga/canjea puntos de forma atómica)
export const crearTransaccion = async (req, res) => {
  try {
    const { id_cliente, monto, referencia_venta, fecha_ingreso, fecha_salida, canjear_puntos } = req.body;
    const montoNum = Number(monto);

    if (!id_cliente || !montoNum || montoNum <= 0) {
      return res.status(400).json({ message: 'Cliente y un monto válido son requeridos' });
    }

    const [cli] = await pool.query('SELECT * FROM clientes WHERE id_cliente = ?', [id_cliente]);
    if (cli.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    const cliente = cli[0];
    if (cliente.id_estado !== 1) {
      return res.status(400).json({ message: 'El cliente no está activo' });
    }

    // Reglas configurables
    const puntosPorDolar  = Number(await getConfigValor('puntos_por_dolar', '1'));
    const puntosParaCanje = Number(await getConfigValor('puntos_para_canje', '100'));
    const valorCanje      = Number(await getConfigValor('valor_canje', '5'));

    // Escenario activo según la fecha de hoy (fecha especial o dentro del rango)
    const [esc] = await pool.query(
      `SELECT * FROM escenarios
       WHERE activo = 1
         AND ( fecha_especial = CURDATE()
               OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND CURDATE() BETWEEN fecha_inicio AND fecha_fin) )
       LIMIT 1`
    );
    const escenario = esc[0] || null;

    // Cálculo de puntos y descuento
    let puntosOtorgados = Math.floor(montoNum * puntosPorDolar) + (escenario ? escenario.puntos_extra : 0);
    let descuento       = escenario ? Number(escenario.descuento_extra) : 0;
    let puntosCanjeados = 0;

    if (canjear_puntos && cliente.puntos_acumulados >= puntosParaCanje) {
      puntosCanjeados = puntosParaCanje;
      descuento += valorCanje;
    }
    if (descuento > montoNum) descuento = montoNum;

    const saldoFinal = cliente.puntos_acumulados + puntosOtorgados - puntosCanjeados;

    // Escritura atómica (transacción de BD)
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO transacciones
          (id_cliente, id_usuario, id_escenario, referencia_venta, fecha_ingreso, fecha_salida,
           monto, descuento_aplicado, puntos_otorgados, puntos_canjeados)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_cliente, req.user.id_usuario, escenario ? escenario.id_escenario : null,
          referencia_venta ?? null, fecha_ingreso || null, fecha_salida || null,
          montoNum, descuento, puntosOtorgados, puntosCanjeados,
        ]
      );
      const idTrans = result.insertId;

      await conn.query(
        'UPDATE clientes SET puntos_acumulados = ? WHERE id_cliente = ?',
        [saldoFinal, id_cliente]
      );

      await conn.query(
        'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
        [id_cliente, idTrans, 'ganado', puntosOtorgados, 'Puntos por transacción']
      );

      if (puntosCanjeados > 0) {
        await conn.query(
          'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
          [id_cliente, idTrans, 'canjeado', -puntosCanjeados, 'Canje de puntos']
        );
      }

      await conn.commit();

      return res.status(201).json({
        message: 'Transacción registrada correctamente',
        id_transaccion: idTrans,
        puntos_otorgados: puntosOtorgados,
        puntos_canjeados: puntosCanjeados,
        descuento_aplicado: Number(descuento.toFixed(2)),
        total_a_pagar: Number((montoNum - descuento).toFixed(2)),
        saldo_puntos: saldoFinal,
        escenario: escenario ? escenario.nombre : null,
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Listar transacciones con filtros (documento y rango de fecha de hospedaje)
export const listarTransacciones = async (req, res) => {
  try {
    const { numero_documento, desde, hasta } = req.query;

    let sql = `
      SELECT t.id_transaccion, t.monto, t.descuento_aplicado, t.puntos_otorgados, t.puntos_canjeados,
             t.referencia_venta, t.fecha_ingreso, t.fecha_salida, t.fecha,
             c.nombres, c.apellidos, c.numero_documento, c.telefono, c.correo,
             td.nombre AS tipo_documento, u.nombre AS cajero
      FROM transacciones t
      JOIN clientes c        ON t.id_cliente = c.id_cliente
      JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
      JOIN usuarios u        ON t.id_usuario = u.id_usuario
      WHERE 1 = 1`;
    const params = [];

    if (numero_documento) {
      sql += ' AND c.numero_documento LIKE ?';
      params.push(`%${numero_documento}%`);
    }
    // Búsqueda por fecha de hospedaje (lo que pidió el hotel)
    if (desde) {
      sql += ' AND t.fecha_ingreso >= ?';
      params.push(desde);
    }
    if (hasta) {
      sql += ' AND t.fecha_ingreso <= ?';
      params.push(hasta);
    }

    sql += ' ORDER BY t.id_transaccion DESC';

    const [rows] = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Resumen del día (para el dashboard)
export const getResumen = async (req, res) => {
  try {
    const [cRows] = await pool.query('SELECT COUNT(*) AS total FROM clientes');
    const [tRows] = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(monto), 0)            AS ventas,
              COALESCE(SUM(puntos_otorgados), 0) AS puntos
       FROM transacciones
       WHERE DATE(fecha) = CURDATE()`
    );

    return res.status(200).json({
      clientes_total:     cRows[0].total,
      transacciones_hoy:  tRows[0].total,
      ventas_hoy:         Number(tRows[0].ventas),
      puntos_hoy:         Number(tRows[0].puntos),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
