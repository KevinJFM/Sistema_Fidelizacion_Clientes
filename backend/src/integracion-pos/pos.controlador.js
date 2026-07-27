// ============================================================
//  Endpoints del módulo de Integración POS (solo admin).
// ============================================================
import pool from '../configuracion/bd.js';
import { obtenerConfigPos, guardarConfigPos, probarConexionPos } from './conexionPos.js';
import { sincronizarTodo, aplicarModoPos } from './pos.servicio.js';

// GET /api/pos/config  -> configuración actual SIN la contraseña
export const obtenerConfig = async (req, res) => {
  try {
    const cfg = await obtenerConfigPos();
    return res.status(200).json({
      host: cfg.host,
      puerto: cfg.puerto,
      usuario: cfg.usuario,
      base_datos: cfg.base_datos,
      modo: cfg.modo,
      tiene_password: !!cfg.password, // no devolvemos la contraseña, solo si hay una guardada
    });
  } catch {
    return res.status(500).json({ message: 'Error al obtener la configuración del POS' });
  }
};

// PUT /api/pos/config  -> guarda los datos de conexión (no cambia el modo)
export const guardarConfig = async (req, res) => {
  try {
    const { host, puerto, usuario, password, base_datos } = req.body;
    if (puerto !== undefined) {
      const p = Number(puerto);
      if (!Number.isInteger(p) || p < 1 || p > 65535) {
        return res.status(400).json({ message: 'Puerto inválido (debe estar entre 1 y 65535)' });
      }
    }
    const guardado = await guardarConfigPos({ host, puerto, usuario, password, base_datos });
    return res.status(200).json({ message: 'Configuración guardada', usuario: guardado.usuario });
  } catch {
    return res.status(500).json({ message: 'Error al guardar la configuración del POS' });
  }
};

// PUT /api/pos/modo  -> cambia entre automatico / manual
export const cambiarModo = async (req, res) => {
  try {
    const { modo } = req.body;
    if (!['automatico', 'manual'].includes(modo)) {
      return res.status(400).json({ message: 'Modo inválido' });
    }
    await guardarConfigPos({ modo });
    await aplicarModoPos(); // arranca o detiene el poller según el nuevo modo
    return res.status(200).json({ message: `Modo cambiado a ${modo}`, modo });
  } catch {
    return res.status(500).json({ message: 'Error al cambiar el modo' });
  }
};

// POST /api/pos/probar  -> prueba la conexión (si no mandan contraseña, usa la guardada)
export const probarConexion = async (req, res) => {
  try {
    const cfg = await obtenerConfigPos();
    const datos = {
      host: req.body.host ?? cfg.host,
      puerto: req.body.puerto ?? cfg.puerto,
      usuario: req.body.usuario ?? cfg.usuario,
      password: (req.body.password === undefined || req.body.password === '') ? cfg.password : req.body.password,
      base_datos: req.body.base_datos ?? cfg.base_datos,
    };
    const resultado = await probarConexionPos(datos);
    return res.status(200).json(resultado); // siempre 200; el front lee el campo "ok"
  } catch {
    return res.status(200).json({ ok: false, mensaje: 'Error al probar la conexión' });
  }
};

// POST /api/pos/sincronizar  -> corre la sincronización ahora mismo (clientes + pagos)
export const sincronizarAhora = async (req, res) => {
  try {
    const resultado = await sincronizarTodo();

    // Ya hay una sincronización corriendo (candado): no se lanza otra.
    if (resultado.enCurso) {
      return res.status(200).json({ message: 'Ya hay una sincronización en curso. Espera a que termine.', enCurso: true });
    }

    const cli = resultado.clientes;
    const r = resultado.pagos;
    if (r.error) return res.status(400).json({ message: r.error });
    return res.status(200).json({
      message: `Listo: ${cli.creados} cliente(s) nuevo(s), ` +
               `${r.creadas} transacción(es) creada(s), ${r.sinCliente} sin cliente identificado.`,
      clientes: cli,
      ...r,
    });
  } catch {
    return res.status(500).json({ message: 'No se pudo sincronizar. Revisa la conexión con el POS.' });
  }
};

// GET /api/pos/estado  -> resumen para la pantalla
export const obtenerEstado = async (req, res) => {
  try {
    const cfg = await obtenerConfigPos();
    const [porResultado] = await pool.query(
      'SELECT resultado, COUNT(*) AS total FROM pos_pedido_procesado GROUP BY resultado'
    );
    const [ultima] = await pool.query(
      'SELECT MAX(fecha_procesado) AS ultima FROM pos_pedido_procesado'
    );
    const conteo = { creada: 0, sin_cliente: 0 };
    for (const r of porResultado) conteo[r.resultado] = r.total;

    // Clientes traídos por el "Sync de clientes"
    const [porResultadoCli] = await pool.query(
      'SELECT resultado, COUNT(*) AS total FROM pos_cliente_procesado GROUP BY resultado'
    );
    const conteoCli = { creado: 0, emparejado: 0, sin_documento: 0 };
    for (const r of porResultadoCli) conteoCli[r.resultado] = r.total;

    return res.status(200).json({
      modo: cfg.modo,
      transacciones_creadas: conteo.creada || 0,
      sin_cliente: conteo.sin_cliente || 0,
      clientes_creados: conteoCli.creado || 0,
      clientes_emparejados: conteoCli.emparejado || 0,
      ultima_sincronizacion: ultima[0].ultima,
    });
  } catch {
    return res.status(500).json({ message: 'Error al obtener el estado' });
  }
};
