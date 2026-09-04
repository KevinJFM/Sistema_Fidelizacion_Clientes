import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';
import { enviarComprobante } from '../configuracion/correo.js';
import { calcularBeneficios } from '../dominio/reglasPuntos.js';

// Lee varias claves de configuracion en una sola consulta. `defaults` = { clave: valorPorDefecto }; rellena con el default las que falten.
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

// Avisa por push (aparte del "¡Ganaste puntos!") cuando el cliente ACABA de alcanzar una o más
// recompensas al ganar puntos (cruzó el umbral). Lista todas las que ya puede canjear en ese momento.
// Solo se envía si desbloqueó algo nuevo con esta transacción (evita repetir el aviso en cada compra).
const avisarRecompensasDesbloqueadas = async (pushToken, saldoAntes, saldoDespues) => {
  try {
    // Menor a mayor: la recompensa más accesible (menos puntos) va primero, para que se vea
    // aunque Android recorte la notificación colapsada.
    const [recompensas] = await pool.query(
      'SELECT nombre, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC, nombre ASC'
    );
    const desbloqueoNuevo = recompensas.some((r) => r.puntos > saldoAntes && r.puntos <= saldoDespues);
    if (!desbloqueoNuevo) return;

    const nombres = recompensas.filter((r) => r.puntos <= saldoDespues).map((r) => r.nombre);
    if (nombres.length === 0) return;

    const cuerpo = nombres.length === 1
      ? `Con tus ${saldoDespues} pts ya puedes canjear ${nombres[0]}. Podrás canjearlo en tu próximo consumo.`
      : `Con tus ${saldoDespues} pts ya puedes canjear una de estas: ${nombres.join(', ')}. Elige una en tu próximo consumo.`;

    enviarPush(pushToken, '¡Ya puedes canjear! 🎉', cuerpo, { tipo: 'recompensa_desbloqueada' });
  } catch {
    // El aviso nunca debe romper la transacción.
  }
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

// Opciones de promoción que el cajero puede ELEGIR para este cliente (modelo manual):
// la bienvenida (solo si es su primera compra y está activa) y las promociones vigentes HOY
// que el cliente no haya agotado. Alimenta el select del panel.
export const promocionesAplicables = async (req, res) => {
  try {
    const idCliente = Number(req.query.id_cliente);
    if (!idCliente) return res.status(400).json({ message: 'Cliente no válido' });

    const cfg = await obtenerConfigs({
      bienvenida_puntos: '20',
      bienvenida_descuento: '2',
      bienvenida_activo: '1',
    });

    const [filasConteo] = await pool.query(
      'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ? AND anulada = 0',
      [idCliente]
    );
    const esPrimeraCompra = filasConteo[0].total === 0;
    const bienvenidaActivo = Number(cfg.bienvenida_activo) === 1;

    // Promociones vigentes hoy (fecha especial o dentro del rango).
    const [promos] = await pool.query(
      `SELECT id_escenario, nombre, puntos_extra, descuento_extra, max_usos_cliente
       FROM promociones
       WHERE activo = 1
         AND ( fecha_especial = CURDATE()
               OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND CURDATE() BETWEEN fecha_inicio AND fecha_fin) )
       ORDER BY id_escenario DESC`
    );

    // Descarta las que el cliente ya agotó (según su máximo de usos).
    const promociones = [];
    for (const p of promos) {
      const maxUsos = Number(p.max_usos_cliente) || 0;
      if (maxUsos > 0) {
        const [usos] = await pool.query(
          'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ? AND id_escenario = ? AND anulada = 0',
          [idCliente, p.id_escenario]
        );
        if (usos[0].total >= maxUsos) continue;
      }
      promociones.push({
        id_escenario: p.id_escenario,
        nombre: p.nombre,
        puntos_extra: Number(p.puntos_extra),
        descuento_extra: Number(p.descuento_extra),
      });
    }

    return res.status(200).json({
      bienvenida_aplica: esPrimeraCompra && bienvenidaActivo,
      bienvenida: { puntos: Number(cfg.bienvenida_puntos), descuento: Number(cfg.bienvenida_descuento) },
      promociones,
    });
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
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

    // Reglas configurables (tabla configuracion), todas en una consulta. Interruptores 1 = activo (default activo si falta la clave). El canje siempre está activo.
    const cfg = await obtenerConfigs({
      bienvenida_puntos: '20',
      bienvenida_descuento: '2',
      bienvenida_activo: '1',
    });
    const bienvenidaPuntos     = Number(cfg.bienvenida_puntos);
    const bienvenidaDescuento  = Number(cfg.bienvenida_descuento);
    const bienvenidaActivo     = Number(cfg.bienvenida_activo) === 1;

    // ¿Es la primera compra registrada del cliente? (para validar la bienvenida)
    // Las ANULADAS no cuentan: si el cajero se equivocó y anuló la 1.ª compra, la bienvenida
    // debe poder aplicarse de nuevo al volver a registrarla.
    const [filasConteo] = await pool.query(
      'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ? AND anulada = 0',
      [id_cliente]
    );
    const esPrimeraCompra = filasConteo[0].total === 0;

    // Promoción ELEGIDA por el cajero (modelo manual): '' o 'ninguna' = nada,
    // 'bienvenida' = beneficio de primera compra, o el id de una promoción vigente hoy.
    // Se valida SIEMPRE en el backend (no se confía en el cliente). En un canje no aplica.
    const seleccion = String(req.body.promocion ?? '').trim();
    let promocion = null;
    let usarBienvenida = false;

    if (!id_recompensa && seleccion && seleccion !== 'ninguna') {
      if (seleccion === 'bienvenida') {
        if (!esPrimeraCompra) {
          return res.status(400).json({ message: 'La bienvenida solo aplica en la primera compra del cliente' });
        }
        if (!bienvenidaActivo) {
          return res.status(400).json({ message: 'La bienvenida está desactivada en Configuración' });
        }
        usarBienvenida = true;
      } else {
        const idEscenario = Number(seleccion);
        if (!idEscenario) {
          return res.status(400).json({ message: 'Promoción no válida' });
        }
        const [filasPromocion] = await pool.query(
          `SELECT * FROM promociones
           WHERE id_escenario = ? AND activo = 1
             AND ( fecha_especial = CURDATE()
                   OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND CURDATE() BETWEEN fecha_inicio AND fecha_fin) )
           LIMIT 1`,
          [idEscenario]
        );
        if (!filasPromocion.length) {
          return res.status(400).json({ message: 'La promoción no está vigente hoy' });
        }
        promocion = filasPromocion[0];
        // Respeta el máximo de usos por cliente (las anuladas no cuentan: al anular y re-registrar,
        // la promoción vuelve a estar disponible).
        const maxUsos = Number(promocion.max_usos_cliente) || 0;
        if (maxUsos > 0) {
          const [usos] = await pool.query(
            'SELECT COUNT(*) AS total FROM transacciones WHERE id_cliente = ? AND id_escenario = ? AND anulada = 0',
            [id_cliente, promocion.id_escenario]
          );
          if (usos[0].total >= maxUsos) {
            return res.status(400).json({ message: 'El cliente ya alcanzó el máximo de usos de esa promoción' });
          }
        }
      }
    }

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

    // Cálculo de puntos/descuento delegado a la lógica pura (src/dominio/reglasPuntos.js).
    const {
      quiereCanjear,
      aplicaBienvenida,
      puntosBase,
      puntosExtraBienvenida,
      puntosExtraPromocion,
      puntosOtorgados,
      puntosCanjeados,
      descuento,
      promocionesAplicadas,
    } = calcularBeneficios({
      monto: montoNumerico,
      saldoPuntos: cliente.puntos_acumulados,
      esPrimeraCompra: usarBienvenida, // la bienvenida se aplica solo si el cajero la eligió (ya validada)
      promocion,
      recompensa,
      config: {
        bienvenidaPuntos,
        bienvenidaDescuento,
        bienvenidaActivo,
      },
    });

    // Escritura atómica: bloquea la fila del cliente (FOR UPDATE) y actualiza el saldo de forma relativa, para que dos registros simultáneos del mismo cliente no se pisen.
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      // Saldo bloqueado hasta el commit.
      const [filasSaldo] = await conexion.query(
        'SELECT puntos_acumulados FROM clientes WHERE id_cliente = ? FOR UPDATE',
        [id_cliente]
      );
      const puntosActuales = Number(filasSaldo[0].puntos_acumulados);

      // Re-valida el canje contra el saldo bloqueado (evita doble gasto en concurrencia).
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

      // Actualización relativa sobre la fila bloqueada.
      await conexion.query(
        'UPDATE clientes SET puntos_acumulados = puntos_acumulados + ? WHERE id_cliente = ?',
        [puntosOtorgados - puntosCanjeados, id_cliente]
      );

      // "ganado" solo si realmente se otorgan puntos (en un canje no se ganan).
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

      // Notificación push (si tiene la app y token).
      if (cliente.push_token) {
        if (puntosCanjeados > 0) {
          enviarPush(cliente.push_token, 'Canje realizado', `Canjeaste ${recompensa.nombre}. Tu saldo es ${saldoFinal} pts.`);
        } else if (puntosOtorgados > 0) {
          enviarPush(cliente.push_token, `¡Ganaste ${puntosOtorgados} puntos!`, `Tu nuevo saldo es ${saldoFinal} pts.`);
          // Aviso aparte si con estos puntos desbloqueó una o más recompensas nuevas.
          avisarRecompensasDesbloqueadas(cliente.push_token, puntosActuales, saldoFinal);
        }
      }

      // Comprobante por correo (si el cliente tiene correo y la plantilla está activa). No bloquea la respuesta.
      if (cliente.correo) {
        enviarComprobante({
          destino: cliente.correo,
          nombre: cliente.nombres,
          monto: montoNumerico.toFixed(2),
          descuento: Number(descuento).toFixed(2),
          total: (montoNumerico - descuento).toFixed(2),
          puntosOtorgados,
          puntosCanjeados,
          saldo: saldoFinal,
          recompensa: recompensa?.nombre || '',
        }).catch(() => {});
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

// Editar SOLO los datos seguros de una transacción: folio/referencia y fechas de hospedaje.
// A propósito NO deja tocar monto ni puntos: para corregir eso se ANULA y se vuelve a registrar
// (así el saldo del cliente nunca queda inconsistente). No mueve puntos ni saldo.
export const editarTransaccion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Transacción no válida' });

    const { referencia_venta, fecha_ingreso, fecha_salida } = req.body;

    const [filas] = await pool.query(
      'SELECT id_transaccion, anulada FROM transacciones WHERE id_transaccion = ?',
      [id]
    );
    if (filas.length === 0) return res.status(404).json({ message: 'Transacción no encontrada' });
    if (filas[0].anulada) return res.status(400).json({ message: 'No se puede editar una transacción anulada' });

    await pool.query(
      'UPDATE transacciones SET referencia_venta = ?, fecha_ingreso = ?, fecha_salida = ? WHERE id_transaccion = ?',
      [referencia_venta || null, fecha_ingreso || null, fecha_salida || null, id]
    );

    return res.status(200).json({ message: 'Transacción actualizada correctamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Anular una transacción: revierte los puntos al cliente (le devuelve lo canjeado y le quita lo
// otorgado), la marca como anulada (quién/cuándo/por qué) y la deja fuera de los totales. La
// transacción NO se borra: queda en el historial como rastro. Todo de forma atómica y con la
// fila del cliente bloqueada, igual que al registrar.
export const anularTransaccion = async (req, res) => {
  const conexion = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Transacción no válida' });

    const motivo = (req.body?.motivo || '').trim();
    if (!motivo) return res.status(400).json({ message: 'El motivo de anulación es obligatorio' });

    await conexion.beginTransaction();

    // Bloquea la transacción y relee su estado dentro de la transacción SQL.
    const [filas] = await conexion.query(
      'SELECT id_cliente, puntos_otorgados, puntos_canjeados, anulada FROM transacciones WHERE id_transaccion = ? FOR UPDATE',
      [id]
    );
    if (filas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }
    const t = filas[0];
    if (t.anulada) {
      await conexion.rollback();
      return res.status(400).json({ message: 'La transacción ya está anulada' });
    }

    // Reversión del saldo: deshace exactamente lo que hizo la transacción original
    // (le sumó otorgados y le restó canjeados). Delta = -otorgados + canjeados.
    const delta = -Number(t.puntos_otorgados) + Number(t.puntos_canjeados);

    // Saldo bloqueado del cliente hasta el commit.
    const [filasSaldo] = await conexion.query(
      'SELECT puntos_acumulados FROM clientes WHERE id_cliente = ? FOR UPDATE',
      [t.id_cliente]
    );
    const saldoActual = Number(filasSaldo[0].puntos_acumulados);
    const saldoFinal = saldoActual + delta;

    // Integridad: no dejamos el saldo negativo. Pasa si el cliente ya gastó los puntos
    // que había ganado con esta transacción. En ese caso no se puede anular sin más.
    if (saldoFinal < 0) {
      await conexion.rollback();
      return res.status(400).json({
        message: 'No se puede anular: el cliente ya usó parte de esos puntos (el saldo quedaría negativo).',
      });
    }

    // Marca la transacción como anulada (con auditoría).
    await conexion.query(
      'UPDATE transacciones SET anulada = 1, anulada_por = ?, anulada_en = NOW(), motivo_anulacion = ? WHERE id_transaccion = ?',
      [req.usuario.id_usuario, motivo, id]
    );

    // Aplica la reversión al saldo (relativa, sobre la fila bloqueada).
    await conexion.query(
      'UPDATE clientes SET puntos_acumulados = puntos_acumulados + ? WHERE id_cliente = ?',
      [delta, t.id_cliente]
    );

    // Deja el asiento de reversión en el libro mayor de puntos (no borra los movimientos originales).
    if (delta !== 0) {
      await conexion.query(
        'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion) VALUES (?, ?, ?, ?, ?)',
        [t.id_cliente, id, 'ajuste', delta, `Anulación transacción #${id}: ${motivo}`.slice(0, 150)]
      );
    }

    // Bitácora de auditoría.
    await conexion.query(
      'INSERT INTO bitacora (id_usuario, accion, entidad, id_registro, detalle, ip) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id_usuario, 'anular', 'transaccion', id, `Motivo: ${motivo}`.slice(0, 255), req.ip || null]
    );

    await conexion.commit();
    return res.status(200).json({ message: 'Transacción anulada correctamente', saldo_puntos: saldoFinal });
  } catch (error) {
    await conexion.rollback();
    return res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    conexion.release();
  }
};

// Listar transacciones con filtros (documento y rango de fecha de hospedaje)
export const listarTransacciones = async (req, res) => {
  try {
    const { numero_documento, tipo_documento, desde, hasta } = req.query;

    let sql = `
      SELECT t.id_transaccion, t.id_cliente, t.monto, t.descuento_aplicado, t.puntos_otorgados, t.puntos_canjeados,
             t.referencia_venta, t.fecha_ingreso, t.fecha_salida, t.fecha,
             t.anulada, t.anulada_en, t.motivo_anulacion,
             c.nombres, c.apellidos, c.numero_documento, c.telefono, c.correo, c.pais,
             td.nombre AS tipo_documento, u.nombre AS cajero,
             ua.nombre AS anulada_por,
             p.nombre AS nombre_promocion
      FROM transacciones t
      JOIN clientes c         ON t.id_cliente = c.id_cliente
      JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
      JOIN usuarios u         ON t.id_usuario = u.id_usuario
      LEFT JOIN usuarios ua   ON t.anulada_por = ua.id_usuario
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

    // Tope defensivo alto: el panel pagina y exporta (CSV/PDF) del lado del cliente sobre esta lista, por eso se deja amplio. Override: ?limite=N.
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50000, 1), 100000);
    sql += ' LIMIT ?';
    // Pedimos una fila extra: si vuelve, hubo recorte.
    parametros.push(limite + 1);

    const [filas] = await pool.query(sql, parametros);

    // Si se alcanzó el tope, se avisa por cabecera (el panel muestra el aviso).
    const truncado = filas.length > limite;
    if (truncado) filas.length = limite; // descartamos la fila sonda
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
         AND anulada = 0
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
       WHERE DATE(fecha) = CURDATE()
         AND anulada = 0`
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
