import api from '../api/api';

export const loginCliente = async (datos) => {
  const { data } = await api.post('/portal/login', datos);
  return data;
};

export const getMisPuntos = async () => {
  const { data } = await api.get('/portal/mis-puntos');
  return data;
};

export const getMisMovimientos = async () => {
  const { data } = await api.get('/portal/mis-movimientos');
  return data;
};

// Mensaje amigable: distingue "sin internet" de error del servidor
export const mensajeError = (err, fallback = 'Ocurrió un error') => {
  if (err?.response) return err.response.data?.message || fallback;
  return 'No se pudo conectar. Revisa tu conexión a internet.';
};
