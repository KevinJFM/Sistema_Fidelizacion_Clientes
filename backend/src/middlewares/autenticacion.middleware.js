import jwt from 'jsonwebtoken';
import pool from '../configuracion/bd.js';

// Verifica el token de acceso y carga el usuario en req.usuario
export const verificarToken = (req, res, next) => {
  try {
    const encabezadoAuth = req.headers.authorization;

    if (!encabezadoAuth) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Formato esperado: "Bearer <token>". Se valida explícitamente para no depender de
    // que exista el espacio (un header mal formado da 401 claro, no un error de split).
    const partes = encabezadoAuth.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer' || !partes[1].trim()) {
      return res.status(401).json({ message: 'Formato de autorización inválido' });
    }
    const token = partes[1].trim();

    const datosToken = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.usuario = datosToken;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// Sesión única por superficie (solo clientes): el 'sid' del token debe coincidir
// con la ranura (sesion_app / sesion_portal) guardada en la BD. Si no coincide, es
// que el cliente inició sesión en otro dispositivo de esa misma superficie.
export const verificarSesionCliente = async (req, res, next) => {
  try {
    const { id_cliente, origen, sid } = req.usuario || {};
    if (!id_cliente) return res.status(401).json({ message: 'No autenticado' });

    const columna = origen === 'app' ? 'sesion_app' : 'sesion_portal';
    const [filas] = await pool.query(
      `SELECT ${columna} AS sesion FROM clientes WHERE id_cliente = ? LIMIT 1`,
      [id_cliente]
    );
    if (!filas.length || !sid || filas[0].sesion !== sid) {
      return res.status(401).json({ message: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo.' });
    }
    next();
  } catch {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Autoriza el acceso solo a los roles indicados
export const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ message: 'No tienes permisos' });
    }

    next();
  };
};
