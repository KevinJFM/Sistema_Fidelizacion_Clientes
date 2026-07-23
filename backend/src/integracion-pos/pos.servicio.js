// ============================================================
//  Sincronización POS -> Fidelización.
//  Lee los pedidos PAGADOS POR COMPLETO del POS y, por cada uno nuevo:
//   1) identifica o crea el cliente en NUESTRA estructura (A+B),
//   2) crea la transacción con la FECHA del pago y otorga puntos,
//   3) lo marca como procesado (no se duplica).
//
//  Reglas:
//   - Puntos = total del pedido (consumo), regla fija $1 = 1 punto.
//   - Identificación del cliente (A+B): se empareja por documento / correo /
//     teléfono con un cliente ya registrado. Si no existe, se CREA solo
//     cuando el POS trae un documento de nuestro catálogo (DUI o Pasaporte,
//     según su tabla `documento`; el número va en el campo NIT del cliente).
//     NIT / Otro / Carnet de residente no crean cliente. "Consumidor final"
//     sin datos identificables NO gana puntos.
//   - Solo lectura sobre el POS: nunca modificamos su base.
// ============================================================
import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';
import { obtenerConfigPos, obtenerPoolPos } from './conexionPos.js';

const MINUTOS_POLL = 2; // frecuencia del modo automático

// ---------- utilidades ----------
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const soloDigitos = (s) => String(s ?? '').replace(/\D/g, '');
const esCorreoValido = (c) => !!c && REGEX_CORREO.test(String(c).trim());

// Del nombre del POS (un solo campo) saca nombres + apellidos
const partirNombre = (nombre) => {
  const limpio = String(nombre ?? '').trim() || 'Cliente POS';
  const partes = limpio.split(/\s+/);
  const nombres = partes.shift();
  const apellidos = partes.join(' '); // puede quedar vacío (la columna lo permite)
  return { nombres, apellidos };
};

// Deriva un documento utilizable del cliente del POS.
// El TIPO se lee del catálogo `documento` del POS (cliente.idDocumento -> documento.tipoDocumento)
// y el NÚMERO del campo NIT. Solo DUI y Pasaporte existen en nuestro catálogo:
// NIT / Otro / Carnet de residente NO crean cliente (pero pueden emparejarse por correo/teléfono).
// Devuelve { tipo, numero } o null si no hay documento usable.
const derivarDocumento = (posCliente) => {
  const numero = String(posCliente.NIT ?? '').trim();
  const tipoPos = String(posCliente.tipoDocumentoPos ?? '').trim().toUpperCase();

  if (tipoPos === 'DUI') {
    const dig = soloDigitos(numero);
    if (dig.length === 9) return { tipo: 'DUI', numero: `${dig.slice(0, 8)}-${dig.slice(8)}` };
    return null; // marcado como DUI pero el número no es válido
  }
  if (tipoPos === 'PASAPORTE') {
    const pas = numero.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (pas.length >= 6 && pas.length <= 12) return { tipo: 'Pasaporte', numero: pas };
    return null;
  }

  // Respaldo: cliente sin tipo marcado pero cuyo número parece un DUI (9 dígitos)
  if (!tipoPos) {
    const dig = soloDigitos(numero);
    if (dig.length === 9) return { tipo: 'DUI', numero: `${dig.slice(0, 8)}-${dig.slice(8)}` };
  }
  return null;
};

// Usuario (recepcionista/admin) al que se le atribuyen las transacciones automáticas
let idUsuarioCache = null;
const obtenerUsuarioRegistrador = async () => {
  if (idUsuarioCache) return idUsuarioCache;
  const [admin] = await pool.query(
    `SELECT u.id_usuario FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol
     WHERE r.rol = 'admin' ORDER BY u.id_usuario LIMIT 1`
  );
  if (admin.length) { idUsuarioCache = admin[0].id_usuario; return idUsuarioCache; }
  const [cualquiera] = await pool.query('SELECT id_usuario FROM usuarios ORDER BY id_usuario LIMIT 1');
  idUsuarioCache = cualquiera.length ? cualquiera[0].id_usuario : null;
  return idUsuarioCache;
};

// ---------- identificación / creación del cliente (A + B) ----------
const buscarClienteExistente = async (posCliente, doc) => {
  if (doc) {
    const [f] = await pool.query(
      `SELECT c.id_cliente FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE td.nombre = ? AND c.numero_documento = ? LIMIT 1`,
      [doc.tipo, doc.numero]
    );
    if (f.length) return f[0].id_cliente;
  }
  if (esCorreoValido(posCliente.email)) {
    const [f] = await pool.query('SELECT id_cliente FROM clientes WHERE correo = ? LIMIT 1', [String(posCliente.email).trim()]);
    if (f.length) return f[0].id_cliente;
  }
  const tel = String(posCliente.telefono ?? '').trim();
  if (tel) {
    const [f] = await pool.query('SELECT id_cliente FROM clientes WHERE telefono = ? LIMIT 1', [tel]);
    if (f.length) return f[0].id_cliente;
  }
  return null;
};

const identificarOCrearCliente = async (posCliente) => {
  const doc = derivarDocumento(posCliente);

  // (A) emparejar con un cliente ya registrado
  const existente = await buscarClienteExistente(posCliente, doc);
  if (existente) return existente;

  // (B) crear solo si el POS trae un DUI (sin documento no encaja en nuestra estructura)
  if (!doc) return null;

  const [td] = await pool.query('SELECT id_tipo_documento FROM tipos_documento WHERE nombre = ? LIMIT 1', [doc.tipo]);
  if (!td.length) return null;

  const { nombres, apellidos } = partirNombre(posCliente.nombre);
  const correo = esCorreoValido(posCliente.email) ? String(posCliente.email).trim() : null;
  const tel = String(posCliente.telefono ?? '').trim() || null;

  try {
    const [r] = await pool.query(
      `INSERT INTO clientes
        (id_tipo_documento, numero_documento, nombres, apellidos, telefono, correo, puntos_acumulados, id_estado)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [td[0].id_tipo_documento, doc.numero, nombres, apellidos, tel, correo]
    );
    return r.insertId;
  } catch {
    // Carrera: si ya se creó, buscarlo por documento
    const [f] = await pool.query(
      `SELECT c.id_cliente FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE td.nombre = ? AND c.numero_documento = ? LIMIT 1`,
      [doc.tipo, doc.numero]
    );
    return f.length ? f[0].id_cliente : null;
  }
};

// ---------- creación de la transacción (base $1 = 1 punto, con la fecha del pago) ----------
const registrarTransaccionPos = async ({ id_cliente, monto, referencia, fecha, idUsuario }) => {
  const montoNum = Number(monto) || 0;
  const puntos = Math.max(0, Math.floor(montoNum)); // $1 = 1 punto

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [r] = await conexion.query(
      `INSERT INTO transacciones
        (id_cliente, id_usuario, referencia_venta, monto, descuento_aplicado, puntos_otorgados, puntos_canjeados, fecha)
       VALUES (?, ?, ?, ?, 0, ?, 0, ?)`,
      [id_cliente, idUsuario, referencia, montoNum, puntos, fecha]
    );
    const idTx = r.insertId;

    if (puntos > 0) {
      await conexion.query('UPDATE clientes SET puntos_acumulados = puntos_acumulados + ? WHERE id_cliente = ?', [puntos, id_cliente]);
      await conexion.query(
        'INSERT INTO movimientos_puntos (id_cliente, id_transaccion, tipo, puntos, descripcion, fecha) VALUES (?, ?, ?, ?, ?, ?)',
        [id_cliente, idTx, 'ganado', puntos, 'Puntos por consumo (POS)', fecha]
      );
    }
    await conexion.commit();

    // Notificación push (si el cliente tiene la app)
    if (puntos > 0) {
      const [c] = await pool.query('SELECT push_token, puntos_acumulados FROM clientes WHERE id_cliente = ?', [id_cliente]);
      if (c.length && c[0].push_token) {
        enviarPush(c[0].push_token, `¡Ganaste ${puntos} puntos!`, `Tu nuevo saldo es ${c[0].puntos_acumulados} pts.`);
      }
    }
    return idTx;
  } catch (e) {
    await conexion.rollback();
    throw e;
  } finally {
    conexion.release();
  }
};

const marcarProcesado = async (idPedido, idTx, idCliente, resultado, detalle) => {
  await pool.query(
    `INSERT INTO pos_pedido_procesado (id_pedido_pos, id_transaccion, id_cliente, resultado, detalle)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id_transaccion = VALUES(id_transaccion), id_cliente = VALUES(id_cliente),
       resultado = VALUES(resultado), detalle = VALUES(detalle)`,
    [idPedido, idTx, idCliente, resultado, detalle]
  );
};

// ---------- proceso principal ----------
export const sincronizarPagos = async () => {
  const idUsuario = await obtenerUsuarioRegistrador();
  if (!idUsuario) return { creadas: 0, sinCliente: 0, revisados: 0, error: 'No hay un usuario para registrar las transacciones' };

  const pos = await obtenerPoolPos();

  // Pedidos PAGADOS POR COMPLETO: la suma de sus pagos cubre el total a pagar.
  // OJO: en este POS "cancelado" = cuenta COBRADA (cancelar la cuenta = pagarla),
  // por eso NO se filtra por ese campo. Los ANULADOS sí se excluyen.
  // El tipo de documento del cliente se lee del catálogo `documento` del POS.
  const [pedidos] = await pos.query(`
    SELECT p.idPedido, p.total, p.totalPago, p.fecha,
           c.nombre, c.email, c.telefono, c.NIT, c.idDocumento,
           d.tipoDocumento AS tipoDocumentoPos,
           (SELECT MAX(pc.fechaPago) FROM pago_combinado pc WHERE pc.idPedido = p.idPedido) AS fechaPago
    FROM pedido p
    LEFT JOIN cliente c ON p.idCliente = c.idCliente
    LEFT JOIN documento d ON c.idDocumento = d.idDocumento
    WHERE (p.anular = 0 OR p.anular IS NULL)
      AND p.totalPago > 0
      AND (SELECT COALESCE(SUM(pc.monto), 0)
             FROM pago_combinado pc
            WHERE pc.idPedido = p.idPedido) >= p.totalPago - 0.01
    ORDER BY p.idPedido ASC
  `);

  const [procesados] = await pool.query('SELECT id_pedido_pos FROM pos_pedido_procesado');
  const yaProcesado = new Set(procesados.map((r) => r.id_pedido_pos));

  let creadas = 0, sinCliente = 0;
  for (const ped of pedidos) {
    if (yaProcesado.has(ped.idPedido)) continue;
    try {
      const idCliente = await identificarOCrearCliente(ped);
      if (!idCliente) {
        await marcarProcesado(ped.idPedido, null, null, 'sin_cliente', 'Cliente no identificado (sin DUI ni correo/teléfono coincidente)');
        sinCliente++;
        continue;
      }
      const monto = Number(ped.total) || 0;                 // consumo del pedido
      const fecha = ped.fechaPago || ped.fecha || new Date(); // fecha del pago
      const idTx = await registrarTransaccionPos({
        id_cliente: idCliente, monto, referencia: `POS #${ped.idPedido}`, fecha, idUsuario,
      });
      await marcarProcesado(ped.idPedido, idTx, idCliente, 'creada', null);
      creadas++;
    } catch {
      // No lo marcamos: se reintenta en la próxima sincronización
    }
  }
  return { creadas, sinCliente, revisados: pedidos.length };
};

// ---------- poller del modo automático ----------
let temporizador = null;

// Arranca o detiene el poller según el modo guardado (automatico/manual)
export const aplicarModoPos = async () => {
  let cfg;
  try { cfg = await obtenerConfigPos(); } catch { return; }

  if (cfg.modo === 'automatico') {
    if (!temporizador) {
      // Solo arranca el ciclo (cada 2 min). NO sincroniza de inmediato al activar:
      // la primera corrida es del ciclo o del botón "Sincronizar ahora".
      temporizador = setInterval(() => { sincronizarPagos().catch(() => {}); }, MINUTOS_POLL * 60 * 1000);
    }
  } else if (temporizador) {
    clearInterval(temporizador);
    temporizador = null;
  }
};

// Se llama al arrancar el servidor
export const iniciarIntegracionPos = () => {
  aplicarModoPos().catch(() => {});
};
