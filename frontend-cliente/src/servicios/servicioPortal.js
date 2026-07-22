import api from '../api/api';

// ---------- Acceso con código por correo (OTP: DUI + código de 6 dígitos) ----------
export const solicitarCodigo = async (datos) => {
  const { data } = await api.post('/portal/solicitar-codigo', datos);
  return data;
};

export const verificarCodigo = async (datos) => {
  const { data } = await api.post('/portal/verificar-codigo', datos);
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
