// Ruta de inicio según el rol tras iniciar sesión (o al entrar a una ruta no permitida)
export const INICIO_POR_ROL = {
  admin:         '/admin',
  recepcionista: '/admin',
  empleado:      '/admin/historial-cliente',
};

export const inicioDeRol = (rol) => INICIO_POR_ROL[rol] || '/login';
