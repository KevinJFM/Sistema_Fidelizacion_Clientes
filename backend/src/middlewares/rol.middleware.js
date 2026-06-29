// Autorización de roles
export const autorizarRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      // Si req.usuario no existe es porque verificarToken falló
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ message: 'No tienes permisos de administrador' });
    }

    next();
  };
};

export const esAdmin = autorizarRoles('admin');
