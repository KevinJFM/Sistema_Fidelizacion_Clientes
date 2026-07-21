import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../configuracion/bd.js';
import { VALOR_PUNTO } from '../configuracion/recompensas.js';
import { enviarCodigoAcceso } from '../configuracion/correo.js';

// Código de acceso (OTP) por correo
const OTP_MINUTOS = 5;         // vigencia del código
const OTP_MAX_INTENTOS = 5;    // intentos de verificación por código

// Oculta el correo para mostrarlo: valeria@gmail.com -> va*****@gmail.com
const enmascararCorreo = (correo) => {
  if (!correo || !correo.includes('@')) return 'tu correo';
  const [usuario, dominio] = correo.split('@');
  const visible = usuario.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, usuario.length - 2))}@${dominio}`;
};

// ============================================================
//  Portal de autoservicio del cliente (Fase 2)
//  El cliente entra con su documento + un PIN y consulta (solo lectura)
//  sus puntos, cuánto valen y su historial. NO canjea desde aquí.
// ============================================================

const ESTADO_ACTIVO = 1;

// Token del cliente: rol 'cliente' + su id, para reusar los middlewares existentes.
const firmarTokenCliente = (cliente) =>
  jwt.sign(
    { id_cliente: cliente.id_cliente, rol: 'cliente', documento: cliente.numero_documento },
    process.env.JWT_SECRET,
    { expiresIn: '1d' } // el portal no usa refresh; token de 1 día por comodidad
  );

// ===== Acceso con código por correo (OTP) =====

// Paso 1: el cliente ingresa su documento; se le envía un código de 6 dígitos al correo.
export const solicitarCodigo = async (req, res) => {
  try {
    const { tipo_documento, numero_documento } = req.body;
    if (!tipo_documento || !numero_documento) {
      return res.status(400).json({ message: 'Ingresa tu documento' });
    }

    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.correo, c.id_estado
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE td.nombre = ? AND c.numero_documento = ?`,
      [tipo_documento, numero_documento]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'No encontramos ese documento. Contacta al hotel.' });
    }
    const cliente = filas[0];
    if (cliente.id_estado !== ESTADO_ACTIVO) {
      return res.status(403).json({ message: 'Tu cuenta no está activa. Contacta al hotel.' });
    }
    if (!cliente.correo) {
      return res.status(400).json({ message: 'No tienes un correo registrado. Contacta al hotel.' });
    }

    // Código de 6 dígitos, guardado hasheado con vencimiento
    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const codigoHash = await bcrypt.hash(codigo, 10);
    const expira = new Date(Date.now() + OTP_MINUTOS * 60 * 1000);

    await pool.query(
      'UPDATE clientes SET otp_hash = ?, otp_expira = ?, otp_intentos = 0 WHERE id_cliente = ?',
      [codigoHash, expira, cliente.id_cliente]
    );

    const enviado = await enviarCodigoAcceso(cliente.correo, codigo, OTP_MINUTOS);
    // En desarrollo, si el correo no está configurado, el código se ve en la consola del backend.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[OTP] Código para ${cliente.correo}: ${codigo}  (vence en ${OTP_MINUTOS} min)\n`);
    }

    return res.status(200).json({
      message: 'Código enviado',
      destino: enmascararCorreo(cliente.correo),
      minutos: OTP_MINUTOS,
      modo_dev: !enviado && process.env.NODE_ENV !== 'production',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Paso 2: el cliente ingresa el código; si es correcto y no venció, se le da acceso.
export const verificarCodigo = async (req, res) => {
  try {
    const { tipo_documento, numero_documento, codigo } = req.body;
    if (!tipo_documento || !numero_documento || !codigo) {
      return res.status(400).json({ message: 'Faltan datos' });
    }

    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.nombres, c.apellidos, c.numero_documento,
              c.otp_hash, c.otp_expira, c.otp_intentos, c.id_estado
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE td.nombre = ? AND c.numero_documento = ?`,
      [tipo_documento, numero_documento]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    const cliente = filas[0];
    if (cliente.id_estado !== ESTADO_ACTIVO) {
      return res.status(403).json({ message: 'Tu cuenta no está activa. Contacta al hotel.' });
    }
    if (!cliente.otp_hash || !cliente.otp_expira) {
      return res.status(400).json({ message: 'Solicita un código primero.' });
    }
    if (new Date(cliente.otp_expira) < new Date()) {
      return res.status(400).json({ message: 'El código venció. Solicita uno nuevo.' });
    }
    if (cliente.otp_intentos >= OTP_MAX_INTENTOS) {
      return res.status(429).json({ message: 'Demasiados intentos. Solicita un código nuevo.' });
    }

    const valido = await bcrypt.compare(String(codigo), cliente.otp_hash);
    if (!valido) {
      await pool.query('UPDATE clientes SET otp_intentos = otp_intentos + 1 WHERE id_cliente = ?', [cliente.id_cliente]);
      return res.status(401).json({ message: 'Código incorrecto' });
    }

    // Correcto: se limpia el código (un solo uso) y se emite el token
    await pool.query(
      'UPDATE clientes SET otp_hash = NULL, otp_expira = NULL, otp_intentos = 0 WHERE id_cliente = ?',
      [cliente.id_cliente]
    );
    const token = firmarTokenCliente(cliente);

    return res.status(200).json({
      message: 'Bienvenido',
      token,
      cliente: { id_cliente: cliente.id_cliente, nombres: cliente.nombres, apellidos: cliente.apellidos },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Login del cliente por tipo de documento (DUI/Pasaporte) + número + PIN.
// Si el cliente aún no tiene PIN, el primero que ingrese queda guardado (primera vez).
export const loginCliente = async (req, res) => {
  try {
    const { tipo_documento, numero_documento, pin } = req.body;

    if (!tipo_documento || !numero_documento || !pin) {
      return res.status(400).json({ message: 'Documento y PIN son requeridos' });
    }
    if (!/^\d{4,6}$/.test(String(pin))) {
      return res.status(400).json({ message: 'El PIN debe tener entre 4 y 6 dígitos' });
    }

    // Buscar el cliente por el nombre del tipo de documento y el número
    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.nombres, c.apellidos, c.numero_documento,
              c.puntos_acumulados, c.pin_hash, c.id_estado, td.nombre AS tipo_documento
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE td.nombre = ? AND c.numero_documento = ?`,
      [tipo_documento, numero_documento]
    );

    // Mensaje genérico para no revelar si el documento existe o no
    if (filas.length === 0) {
      return res.status(401).json({ message: 'Documento o PIN incorrectos' });
    }

    const cliente = filas[0];
    if (cliente.id_estado !== ESTADO_ACTIVO) {
      return res.status(403).json({ message: 'Tu cuenta no está activa. Contacta al hotel.' });
    }

    let primeraVez = false;

    if (!cliente.pin_hash) {
      // Primera vez: se guarda el PIN que ingresó
      const pinHash = await bcrypt.hash(String(pin), 10);
      await pool.query('UPDATE clientes SET pin_hash = ? WHERE id_cliente = ?', [pinHash, cliente.id_cliente]);
      primeraVez = true;
    } else {
      const pinValido = await bcrypt.compare(String(pin), cliente.pin_hash);
      if (!pinValido) {
        return res.status(401).json({ message: 'Documento o PIN incorrectos' });
      }
    }

    const token = firmarTokenCliente(cliente);

    return res.status(200).json({
      message: primeraVez ? 'PIN creado. ¡Bienvenido!' : 'Bienvenido',
      token,
      primera_vez: primeraVez,
      cliente: {
        id_cliente: cliente.id_cliente,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Datos de puntos del cliente logueado (saldo, valor en $ y catálogo de recompensas)
export const misPuntos = async (req, res) => {
  try {
    const idCliente = req.usuario.id_cliente;

    const [filas] = await pool.query(
      `SELECT c.id_cliente, c.nombres, c.apellidos, c.numero_documento,
              c.telefono, c.correo, c.puntos_acumulados,
              td.nombre AS tipo_documento
       FROM clientes c
       JOIN tipos_documento td ON c.id_tipo_documento = td.id_tipo_documento
       WHERE c.id_cliente = ?`,
      [idCliente]
    );

    if (filas.length === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const cliente = filas[0];
    const puntos = Number(cliente.puntos_acumulados);

    // Catálogo desde BD con el valor en $ y si el cliente puede canjearlo
    const [filasR] = await pool.query(
      'SELECT id, nombre, tipo, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
    );
    const recompensas = filasR.map((r) => ({
      ...r,
      valor: Number((r.puntos * VALOR_PUNTO).toFixed(2)),
      alcanzable: puntos >= r.puntos,
      faltan: puntos >= r.puntos ? 0 : r.puntos - puntos,
    }));

    return res.status(200).json({
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      tipo_documento: cliente.tipo_documento,
      numero_documento: cliente.numero_documento,
      telefono: cliente.telefono,
      correo: cliente.correo,
      puntos_acumulados: puntos,
      valor_punto: VALOR_PUNTO,
      valor_en_dinero: Number((puntos * VALOR_PUNTO).toFixed(2)),
      recompensas,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Guarda el token de notificaciones push del dispositivo del cliente logueado
export const registrarToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Token requerido' });
    }
    await pool.query('UPDATE clientes SET push_token = ? WHERE id_cliente = ?', [token, req.usuario.id_cliente]);
    return res.status(200).json({ message: 'Token registrado' });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Promociones que están activas HOY (para mostrarlas al cliente)
export const promocionesActivas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_escenario, nombre, puntos_extra, descuento_extra,
              fecha_especial, fecha_inicio, fecha_fin
       FROM promociones
       WHERE activo = 1
         AND ( fecha_especial = CURDATE()
               OR (fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND CURDATE() BETWEEN fecha_inicio AND fecha_fin) )
       ORDER BY id_escenario DESC`
    );
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Historial de movimientos de puntos del cliente logueado
export const misMovimientos = async (req, res) => {
  try {
    const idCliente = req.usuario.id_cliente;

    const [filas] = await pool.query(
      `SELECT id_movimiento, tipo, puntos, descripcion, fecha
       FROM movimientos_puntos
       WHERE id_cliente = ?
       ORDER BY id_movimiento DESC
       LIMIT 100`,
      [idCliente]
    );

    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};
