import pool from '../configuracion/bd.js';

// Lee un valor de la tabla configuracion (con valor por defecto)
const obtenerConfig = async (clave, porDefecto) => {
  const [filas] = await pool.query('SELECT valor FROM configuracion WHERE clave = ?', [clave]);
  return filas.length ? filas[0].valor : porDefecto;
};

// Registrar una transacción (otorga/canjea puntos de forma atómica)
export const crearTransaccion = async (req, res) => {
  try {
    const { id_cliente, monto, referencia_venta, fecha_ingreso, fecha_salida, canjear_puntos } = req.body;
    const montoNumerico = Number(monto);

    if (!id_cliente || !montoNumerico || montoNumerico <= 0) {
      return res.status(400).json({ message: 'Cliente y un monto válido son requeridos' });
    }

    const [filasCliente] = await pool.query('SELECT * FROM clientes WHERE id_cliente = ?', [id_cliente]);
    if (filasCliente.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }
    const cliente = filasCliente[0];
    if (cliente.id_estado !== 1) {
      return res.status(400).json({ message: 'El cliente no está activo' });
    }

    // ===== Reglas configurables (se pueden ajustar en la tabla configuracion) =====
    const puntosPorDolar       = Number(await obtenerConfig('puntos_por_dolar', '1'));
    const puntosParaCanje      = Number(await obtenerConfig('puntos_para_canje', '100'));
    const valorCanje           = Number(await obtenerConfig('valor_canje', '5'));
    const bienvenidaPuntos     = Number(await obtenerConfig('bienvenida_puntos', '20'));
    const bienvenidaDescuento  = Number(await obtenerConfig('bienvenida_descuento', '2'));
    const descuentoMontoMinimo = Number(await obtenerConfig('descuento_monto_minimo', '30'));
    const descuentoMontoValor  = Number(await obtenerConfig('descuento_monto_valor', '1'));

    // ¿Es la primera compra registrada del cliente?
    const [filasConteo] = await pool.query(
      'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ?',
      [id_cliente]
    );
    const esPrimeraCompra = filasConteo[0].total === 0;

    // Promoción activa según la fecha de hoy (fecha especial o dentro del rango)
    const [filasPromocion] = await pool.query(
      `SELECT * FROM promociones
       WHERE activo = 1
         AND ( fecha_especial = CURDATE()
               OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND CURDATE() BETWEEN fecha_inicio AND fecha_fin) )
       LIMIT 1`
    );
    const promocion = filasPromocion[0] || null;

    // ============================================================
    //  MOTOR DE REGLAS POR PRIORIDAD
    //  - Los PUNTOS se acumulan (base + bienvenida + promoción)
    //  - El DESCUENTO es uno solo, por prioridad:
    //    1. Canje de puntos (bloquea otros descuentos)
    //    2. Bienvenida (primera compra)
    //    3. Promoción / fecha especial
    //    4. Descuento por monto alto
    // ============================================================
    const promocionesAplicadas = [];
    let puntosOtorgados = Math.floor(montoNumerico * puntosPorDolar); // puntos base (siempre)
    let descuento       = 0;
    let puntosCanjeados = 0;

    const quiereCanjear = canjear_puntos && cliente.puntos_acumulados >= puntosParaCanje;

    // --- Puntos extra (acumulables) ---
    if (esPrimeraCompra) {
      puntosOtorgados += bienvenidaPuntos;
      promocionesAplicadas.push('Bienvenida (primera compra)');
    }
    if (promocion) {
      puntosOtorgados += promocion.puntos_extra;
      promocionesAplicadas.push(`Promoción: ${promocion.nombre}`);
    }

    // --- Descuento: solo el de mayor prioridad ---
    if (quiereCanjear) {
      puntosCanjeados = puntosParaCanje;
      descuento = valorCanje;
      promocionesAplicadas.unshift('Canje de puntos'); // máxima prioridad
    } else if (esPrimeraCompra) {
      descuento = bienvenidaDescuento;
    } else if (promocion) {
      descuento = (Number(promocion.descuento_extra) / 100) * montoNumerico;
    } else if (montoNumerico >= descuentoMontoMinimo) {
      descuento = descuentoMontoValor;
      promocionesAplicadas.push('Descuento por compra alta');
    }

    if (descuento > montoNumerico) descuento = montoNumerico;

    const saldoFinal = cliente.puntos_acumulados + puntosOtorgados - puntosCanjeados;

    // Escritura atómica (transacción de BD)
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.query(
        `INSERT INTO transacciones
          (id_cliente, id_usuario, id_escenario, referencia_venta, fecha_ingreso, fecha_salida,
           monto, descuento_aplicado, puntos_otorgados, puntos_canjeados)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_cliente, req.usuario.id_usuario, promocion ? promocion.id_escenario : null,
          referencia_venta ?? null, fecha_ingreso || null, fecha_salida || null,
          montoNumerico, descuento, puntosOtorgados, puntosCanjeados,
        ]
      );
      const idTransaccion = resultado.insertId;

      await conexion.query(
        'UPDATE clientes SET puntos_acumulados = ? WHERE id_cliente = ?',
        [saldoFinal, id_cliente]
      );

      await conexion.query(
        'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
        [id_cliente, idTransaccion, 'ganado', puntosOtorgados, 'Puntos por transacción']
      );

      if (puntosCanjeados > 0) {
        await conexion.query(
          'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
          [id_cliente, idTransaccion, 'canjeado', -puntosCanjeados, 'Canje de puntos']
        );
      }

      await conexion.commit();

      return res.status(201).json({
        message: 'Transacción registrada correctamente',
        id_transaccion: idTransaccion,
        puntos_otorgados: puntosOtorgados,
        puntos_canjeados: puntosCanjeados,
        descuento_aplicado: Number(descuento.toFixed(2)),
        total_a_pagar: Number((montoNumerico - descuento).toFixed(2)),
        saldo_puntos: saldoFinal,
        promocion: promocion ? promocion.nombre : null,
        promociones_aplicadas: promocionesAplicadas,
        primera_compra: esPrimeraCompra,
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
    const parametros = [];

    if (numero_documento) {
      sql += ' AND c.numero_documento LIKE ?';
      parametros.push(`%${numero_documento}%`);
    }
    // Búsqueda por fecha de hospedaje (lo que pidió el hotel)
    if (desde) {
      sql += ' AND t.fecha_ingreso >= ?';
      parametros.push(desde);
    }
    if (hasta) {
      sql += ' AND t.fecha_ingreso <= ?';
      parametros.push(hasta);
    }

    sql += ' ORDER BY t.id_transaccion DESC';

    const [filas] = await pool.query(sql, parametros);
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Resumen del día (para el dashboard)
export const obtenerResumen = async (req, res) => {
  try {
    const [filasClientes] = await pool.query('SELECT COUNT(*) AS total FROM clientes');
    const [filasTransacciones] = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(monto), 0)            AS ventas,
              COALESCE(SUM(puntos_otorgados), 0) AS puntos
       FROM transacciones
       WHERE DATE(fecha) = CURDATE()`
    );

    return res.status(200).json({
      clientes_total:     filasClientes[0].total,
      transacciones_hoy:  filasTransacciones[0].total,
      ventas_hoy:         Number(filasTransacciones[0].ventas),
      puntos_hoy:         Number(filasTransacciones[0].puntos),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
