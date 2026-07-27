import api from '../api/api';

// ---------- Acceso con código por correo (OTP: DUI + código de 6 dígitos) ----------
export const solicitarCodigo = async (datos) => {
  const { data } = await api.post('/portal/solicitar-codigo', datos);
  return data;
};

export const verificarCodigo = async (datos) => {
  // origen 'portal': la sesión se guarda en la ranura del portal (independiente de la app)
  const { data } = await api.post('/portal/verificar-codigo', { ...datos, origen: 'portal' });
  return data;
};

// Cierra de forma remota la sesión de la APP (para usar desde el portal)
export const cerrarSesionApp = async () => {
  const { data } = await api.post('/portal/cerrar-sesion-remota', { objetivo: 'app' });
  return data;
};

// ---------- Consulta ----------
export const getMisPuntos = async () => {
  const { data } = await api.get('/portal/mis-puntos');
  return data;
};

export const getMisMovimientos = async () => {
  const { data } = await api.get('/portal/mis-movimientos');
  return data;
};

export const getPromociones = async () => {
  const { data } = await api.get('/portal/promociones');
  return data;
};

// Mensaje amigable: distingue "sin internet" de error del servidor
export const mensajeError = (err, fallback = 'Ocurrió un error') => {
  if (err?.response) return err.response.data?.message || fallback;
  return 'No se pudo conectar. Revisa tu conexión a internet.';
};
