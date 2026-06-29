import jwt from 'jsonwebtoken';

// Verifica el token de acceso y carga el usuario en req.usuario
export const verificarToken = (req, res, next) => {
  try {
    const encabezadoAuth = req.headers.authorization;

    if (!encabezadoAuth) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = encabezadoAuth.split(' ')[1].trim();
    const datosToken = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = datosToken;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
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
