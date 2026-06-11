export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
    // Si req. user no existe es porque verify token falló
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json
      ({ message: 'No tienes permisos de administrador' });
    }

    next();
  };
};

export const isAdmin = authorizeRoles('admin');
