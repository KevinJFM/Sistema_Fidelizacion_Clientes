// ============================================================
//  Sincronización POS -> Fidelización. Dos procesos independientes:
//
//  A) Sync de CLIENTES (sincronizarClientes): trae los clientes del POS
//     al módulo, por lotes. Registra a los que traen DUI/Pasaporte y no
//     existen; a los que ya existen los empareja (no duplica).
//
//  B) Sync de PAGOS (sincronizarPagos): por cada pedido PAGADO POR COMPLETO,
//     otorga puntos SOLO si el cliente YA está registrado (emparejando por
//     documento / correo / teléfono). NO crea clientes: si paga alguien que
//     no está en el sistema, no gana puntos (queda 'sin cliente'). El registro
//     lo hace el Sync de clientes o el recepcionista a mano.
//
//  Reglas comunes:
//   - Puntos = total del pedido (consumo), regla fija $1 = 1 punto.
//   - Solo lectura sobre el POS: nunca modificamos su base.
// ============================================================
import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';
import { obtenerConfigPos, obtenerPoolPos } from './conexionPos.js';

const MINUTOS_POLL = 2;    // frecuencia del modo automático
const LOTE_CLIENTES = 200; // cuántos clientes trae el "Sync de clientes" por corrida

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

// Crea un cliente en nuestra base a partir del documento derivado (DUI/Pasaporte).
// Nace con 0 puntos (los puntos llegan después, cuando pague). Devuelve id o null.
const crearClienteConDocumento = async (posCliente, doc) => {
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
      // Solo se otorgan puntos si el cliente YA está registrado (emparejar, NO crear).
      // El registro lo hace el "Sync de clientes" o el recepcionista a mano.
      const doc = derivarDocumento(ped);
      const idCliente = await buscarClienteExistente(ped, doc);
      if (!idCliente) {
        await marcarProcesado(ped.idPedido, null, null, 'sin_cliente', 'Cliente no registrado en el sistema');
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

// ---------- Sync de CLIENTES (trae todos los clientes al módulo, por lotes) ----------
const marcarClienteProcesado = async (idClientePos, idCliente, resultado, detalle) => {
  await pool.query(
    `INSERT INTO pos_cliente_procesado (id_cliente_pos, id_cliente, resultado, detalle)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id_cliente = VALUES(id_cliente), resultado = VALUES(resultado), detalle = VALUES(detalle)`,
    [idClientePos, idCliente, resultado, detalle]
  );
};

// Trae un LOTE de clientes del POS (los que aún no procesamos) y los agrega al módulo.
// Avanza con un cursor por idCliente para NO re-escanear todo cada 2 minutos.
//   - Si ya existe (documento/correo/teléfono): lo empareja, no lo duplica.
//   - Si trae DUI/Pasaporte y no existe: lo CREA con 0 puntos.
//   - Sin documento identificable: no se puede crear (se marca y se salta).
export const sincronizarClientes = async (limite = LOTE_CLIENTES) => {
  const pos = await obtenerPoolPos();

  // Posición: el mayor idCliente del POS que ya procesamos (0 si es la primera vez).
  // (No usar el alias "cursor": es palabra reservada en MySQL.)
  const [[{ desde }]] = await pool.query(
    'SELECT COALESCE(MAX(id_cliente_pos), 0) AS desde FROM pos_cliente_procesado'
  );

  const [clientes] = await pos.query(
    `SELECT c.idCliente, c.nombre, c.email, c.telefono, c.NIT, c.idDocumento,
            d.tipoDocumento AS tipoDocumentoPos
       FROM cliente c
       LEFT JOIN documento d ON c.idDocumento = d.idDocumento
      WHERE c.idCliente > ?
      ORDER BY c.idCliente ASC
      LIMIT ${Number(limite)}`,
    [desde]
  );

  let creados = 0, emparejados = 0, sinDocumento = 0;
  for (const cli of clientes) {
    try {
      const doc = derivarDocumento(cli);

      const existente = await buscarClienteExistente(cli, doc);
      if (existente) {
        await marcarClienteProcesado(cli.idCliente, existente, 'emparejado', null);
        emparejados++;
        continue;
      }
      if (!doc) {
        await marcarClienteProcesado(cli.idCliente, null, 'sin_documento', 'Sin DUI/Pasaporte para crear');
        sinDocumento++;
        continue;
      }
      const idCliente = await crearClienteConDocumento(cli, doc);
      if (idCliente) {
        await marcarClienteProcesado(cli.idCliente, idCliente, 'creado', null);
        creados++;
      } else {
        await marcarClienteProcesado(cli.idCliente, null, 'sin_documento', 'No se pudo crear');
        sinDocumento++;
      }
    } catch {
      // No lo marcamos: se reintenta en la próxima corrida.
    }
  }
  return { creados, emparejados, sinDocumento, revisados: clientes.length };
};

// ---------- candado: nunca correr dos sincronizaciones a la vez ----------
// Evita puntos/clientes duplicados si le dan "Sincronizar" muchas veces seguidas
// o si el clic coincide con el ciclo automático. Corre clientes y luego pagos.
let sincronizando = false;

export const sincronizarTodo = async () => {
  if (sincronizando) return { enCurso: true };
  sincronizando = true;
  try {
    const clientes = await sincronizarClientes();
    const pagos = await sincronizarPagos();
    return { clientes, pagos };
  } finally {
    sincronizando = false;
  }
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
      // sincronizarTodo respeta el candado: si el clic manual ya está corriendo,
      // este ciclo se salta (y viceversa).
      temporizador = setInterval(() => { sincronizarTodo().catch(() => {}); }, MINUTOS_POLL * 60 * 1000);
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
