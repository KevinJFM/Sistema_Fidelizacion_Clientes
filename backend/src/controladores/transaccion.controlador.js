import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';

// Regla FIJA del sistema (no editable): ganar $1 de consumo = 1 punto.
// (El valor del punto $0.05 y el catálogo de canje viven en recompensas.js)
const DOLARES_POR_PUNTO = 1;    // 1 punto por cada $1

// Lee VARIAS claves de la tabla configuracion en UNA sola consulta (evita N queries
// en serie). `defaults` es un objeto { clave: valorPorDefecto }; devuelve { clave: valor }
// con lo que hay en la BD y, si falta alguna clave, su valor por defecto.
const obtenerConfigs = async (defaults) => {
  const claves = Object.keys(defaults);
  if (claves.length === 0) return {};
  const marcadores = claves.map(() => '?').join(', ');
  const [filas] = await pool.query(
    `SELECT clave, valor FROM configuracion WHERE clave IN (${marcadores})`,
    claves
  );
  const mapa = { ...defaults };
  for (const f of filas) mapa[f.clave] = f.valor;
  return mapa;
};

// Listar recompensas activas desde la BD (ruta legacy mantenida por compatibilidad)
export const listarRecompensas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, tipo, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
    );
    const VALOR_PUNTO = 0.05;
    return res.status(200).json(rows.map((r) => ({ ...r, valor: Number((r.puntos * VALOR_PUNTO).toFixed(2)) })));
  } catch {
    return res.status(500).json({ message: 'Error al listar recompensas' });
  }
};

// Registrar una transacción (otorga/canjea puntos de forma atómica)
export const crearTransaccion = async (req, res) => {
  try {
    const { id_cliente, monto, referencia_venta, fecha_ingreso, fecha_salida, id_recompensa } = req.body;
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
    // Se leen TODAS en una sola consulta (antes eran 6 queries en serie).
    // Los interruptores ON/OFF valen 1 = activo; si no existe la clave, se asume activo.
    // El canje SIEMPRE está activo (no es configurable).
    const cfg = await obtenerConfigs({
      bienvenida_puntos: '20',
      bienvenida_descuento: '2',
      descuento_monto_minimo: '30',
      descuento_monto_valor: '1',
      bienvenida_activo: '1',
      descuento_monto_activo: '1',
    });
    const bienvenidaPuntos     = Number(cfg.bienvenida_puntos);
    const bienvenidaDescuento  = Number(cfg.bienvenida_descuento);
    const descuentoMontoMinimo = Number(cfg.descuento_monto_minimo);
    const descuentoMontoValor  = Number(cfg.descuento_monto_valor);
    const bienvenidaActivo     = Number(cfg.bienvenida_activo) === 1;
    const descuentoMontoActivo = Number(cfg.descuento_monto_activo) === 1;

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
    let promocion = filasPromocion[0] || null;

    // Respetar el máximo de usos por cliente: si el cliente ya usó esta promoción
    // tantas veces como el máximo definido, ya no se le vuelve a aplicar.
    if (promocion) {
      const maxUsos = Number(promocion.max_usos_cliente) || 0;
      if (maxUsos > 0) {
        const [usos] = await pool.query(
          'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ? AND id_escenario = ?',
          [id_cliente, promocion.id_escenario]
        );
        if (usos[0].total >= maxUsos) {
          promocion = null; // ya alcanzó el máximo de usos de esta promoción
        }
      }
    }

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
    let puntosExtraBienvenida   = 0;
    let puntosExtraPromocion    = 0;
    let puntosOtorgados         = 0;
    let descuento               = 0;
    let puntosCanjeados         = 0;

    // Recompensa elegida para canjear (consultada desde la BD). Validaciones:
    let recompensa = null;
    if (id_recompensa) {
      const [filasR] = await pool.query(
        'SELECT id, nombre, tipo, puntos FROM recompensas WHERE id = ? AND activo = 1',
        [Number(id_recompensa)]
      );
      if (!filasR.length) return res.status(400).json({ message: 'Recompensa no válida' });
      recompensa = filasR[0];
      if (cliente.puntos_acumulados < recompensa.puntos) {
        return res.status(400).json({ message: 'El cliente no tiene puntos suficientes para esa recompensa' });
      }
    }
    const quiereCanjear = !!recompensa && cliente.puntos_acumulados >= recompensa.puntos;
    const aplicaBienvenida = bienvenidaActivo && esPrimeraCompra;

    // Puntos base (regla fija): 1 punto por cada $1 de consumo. En un canje NO se ganan puntos.
    const puntosBase = quiereCanjear ? 0 : Math.floor(montoNumerico / DOLARES_POR_PUNTO);

    if (quiereCanjear) {
      // CANJE: el cliente usa su beneficio (premio). No gana puntos nuevos ni recibe descuento en $.
      // Paga el monto completo y se le descuentan los puntos del premio.
      puntosCanjeados = recompensa.puntos;
      promocionesAplicadas.push(`Canje: ${recompensa.nombre}`);
    } else {
      // Flujo normal: acumula puntos (base + bienvenida + promoción) y aplica UN descuento por prioridad.
      puntosOtorgados = puntosBase;
      if (aplicaBienvenida) {
        puntosExtraBienvenida = bienvenidaPuntos;
        puntosOtorgados += puntosExtraBienvenida;
        promocionesAplicadas.push('Bienvenida (primera compra)');
      }
      if (promocion) {
        puntosExtraPromocion = Number(promocion.puntos_extra);
        puntosOtorgados += puntosExtraPromocion;
        promocionesAplicadas.push(`Promoción: ${promocion.nombre}`);
      }

      if (aplicaBienvenida) {
        descuento = bienvenidaDescuento;
      } else if (promocion) {
        descuento = (Number(promocion.descuento_extra) / 100) * montoNumerico;
      } else if (descuentoMontoActivo && montoNumerico >= descuentoMontoMinimo) {
        descuento = descuentoMontoValor;
        promocionesAplicadas.push('Descuento por compra alta');
      }
    }

    if (descuento > montoNumerico) descuento = montoNumerico;

    // Escritura atómica (transacción de BD). Bloqueamos la fila del cliente con
    // SELECT ... FOR UPDATE y actualizamos el saldo de forma RELATIVA (no absoluta),
    // para que dos registros simultáneos del mismo cliente (doble clic, o registro
    // manual coincidiendo con el poller del POS) no se pisen: la segunda escritura
    // suma/resta sobre el valor real, en vez de sobrescribir con un saldo ya obsoleto.
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      // Saldo actual bloqueado hasta el commit (nadie más lo modifica mientras tanto).
      const [filasSaldo] = await conexion.query(
        'SELECT puntos_acumulados FROM clientes WHERE id_cliente = ? FOR UPDATE',
        [id_cliente]
      );
      const puntosActuales = Number(filasSaldo[0].puntos_acumulados);

      // Re-validación autoritativa del canje contra el saldo bloqueado: evita el doble
      // gasto si otra transacción restó puntos entre la lectura inicial y este bloqueo.
      if (quiereCanjear && puntosActuales < recompensa.puntos) {
        await conexion.rollback();
        return res.status(400).json({ message: 'El cliente no tiene puntos suficientes para esa recompensa' });
      }

      const saldoFinal = puntosActuales + puntosOtorgados - puntosCanjeados;

      const [resultado] = await conexion.query(
        `INSERT INTO transacciones
          (id_cliente, id_usuario, id_escenario, referencia_venta, fecha_ingreso, fecha_salida,
           monto, descuento_aplicado, puntos_otorgados, puntos_canjeados)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_cliente, req.usuario.id_usuario, (!quiereCanjear && promocion) ? promocion.id_escenario : null,
          referencia_venta ?? null, fecha_ingreso || null, fecha_salida || null,
          montoNumerico, descuento, puntosOtorgados, puntosCanjeados,
        ]
      );
      const idTransaccion = resultado.insertId;

      // Actualización RELATIVA: suma/resta sobre el valor real de la BD (fila bloqueada).
      await conexion.query(
        'UPDATE clientes SET puntos_acumulados = puntos_acumulados + ? WHERE id_cliente = ?',
        [puntosOtorgados - puntosCanjeados, id_cliente]
      );

      // Solo se registra "ganado" cuando realmente se otorgan puntos (en un canje no se ganan)
      if (puntosOtorgados > 0) {
        await conexion.query(
          'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
          [id_cliente, idTransaccion, 'ganado', puntosOtorgados, 'Puntos por transacción']
        );
      }

      if (puntosCanjeados > 0) {
        await conexion.query(
          'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
          [id_cliente, idTransaccion, 'canjeado', -puntosCanjeados, `Canje: ${recompensa.nombre}`]
        );
      }

      await conexion.commit();

      // Notificación push al cliente (si tiene la app instalada y token registrado)
      if (cliente.push_token) {
        if (puntosCanjeados > 0) {
          enviarPush(cliente.push_token, 'Canje realizado', `Canjeaste ${recompensa.nombre}. Tu saldo es ${saldoFinal} pts.`);
        } else if (puntosOtorgados > 0) {
          enviarPush(cliente.push_token, `¡Ganaste ${puntosOtorgados} puntos!`, `Tu nuevo saldo es ${saldoFinal} pts.`);
        }
      }

      return res.status(201).json({
        message: 'Transacción registrada correctamente',
        id_transaccion: idTransaccion,
        puntos_base: puntosBase,
        puntos_extra_bienvenida: puntosExtraBienvenida,
        puntos_extra_promocion: puntosExtraPromocion,
        puntos_otorgados: puntosOtorgados,
        puntos_canjeados: puntosCanjeados,
        descuento_aplicado: Number(descuento.toFixed(2)),
        porcentaje_descuento_promo: promocion && !quiereCanjear && !aplicaBienvenida ? Number(promocion.descuento_extra) : null,
        total_a_pagar: Number((montoNumerico - descuento).toFixed(2)),
        saldo_puntos: saldoFinal,
        promocion: (!quiereCanjear && promocion) ? promocion.nombre : null,
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
    const { numero_documento, tipo_documento, desde, hasta } = req.query;

    let sql = `
      SELECT t.id_transaccion, t.id_cliente, t.monto, t.descuento_aplicado, t.puntos_otorgados, t.puntos_canjeados,
             t.referencia_venta, t.fecha_ingreso, t.fecha_salida, t.fecha,
             c.nombres, c.apellidos, c.numero_documento, c.telefono, c.correo,
             td.nombre AS tipo_documento, u.nombre AS cajero,
             p.nombre AS nombre_promocion
      FROM transacciones t
      JOIN clientes c         ON t.id_cliente = c.id_cliente
      JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
      JOIN usuarios u         ON t.id_usuario = u.id_usuario
      LEFT JOIN promociones p ON t.id_escenario = p.id_escenario
      WHERE 1 = 1`;
    const parametros = [];

    if (numero_documento) {
      sql += ' AND c.numero_documento LIKE ?';
      parametros.push(`%${numero_documento}%`);
    }
    // Filtro por tipo de documento (DUI, Pasaporte, etc.)
    if (tipo_documento) {
      sql += ' AND td.nombre = ?';
      parametros.push(tipo_documento);
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

    // Tope solo defensivo (evita traer un resultado sin límite si algún día la tabla
    // fuera gigantesca). El panel pagina y EXPORTA del lado del cliente sobre esta misma
    // lista, así que el tope se deja MUY alto para que la descarga (CSV/PDF) salga
    // completa —desde la primera hasta la última— filtrando por DUI, Pasaporte o todos.
    // Un hotel tardaría años en acercarse a 50 000 filas por filtro. Override: ?limite=N.
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50000, 1), 100000);
    sql += ' LIMIT ?';
    // Pedimos UNA fila de más que el tope: si vuelve, es señal de que había más y se recortó.
    parametros.push(limite + 1);

    const [filas] = await pool.query(sql, parametros);

    // ¿Se alcanzó el tope? Avisamos por cabecera (el cuerpo sigue siendo el arreglo de
    // siempre, no se rompe nada). El panel lee esto para mostrar un aviso al usuario.
    const truncado = filas.length > limite;
    if (truncado) filas.length = limite; // descartamos la fila extra que pedimos de sonda
    res.set('X-Historial-Truncado', truncado ? '1' : '0');
    res.set('X-Historial-Limite', String(limite));

    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Actividad de los últimos 7 días (para el gráfico del dashboard)
export const getResumenSemanal = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT DATE(fecha) AS dia,
              COUNT(*)                             AS transacciones,
              COALESCE(SUM(monto), 0)              AS ventas,
              COALESCE(SUM(puntos_otorgados), 0)   AS puntos
       FROM transacciones
       WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(fecha)
       ORDER BY dia ASC`
    );
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
