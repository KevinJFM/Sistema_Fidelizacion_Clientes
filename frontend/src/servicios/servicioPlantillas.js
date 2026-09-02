import api from '../api/api';

// Plantillas de correo (contenido editable de cada correo al cliente).
export const getPlantillas = async () => {
  const { data } = await api.get('/plantillas');
  return data;
};

export const actualizarPlantilla = async (clave, datos) => {
  const { data } = await api.put(`/plantillas/${clave}`, datos);
  return data;
};

// Vista previa con datos de ejemplo. Acepta cambios sin guardar. Devuelve { asunto, html }.
export const previewPlantilla = async (clave, datos = {}) => {
  const { data } = await api.post(`/plantillas/${clave}/preview`, datos);
  return data;
};

// Envía una prueba al correo del admin.
export const enviarPruebaPlantilla = async (clave, datos = {}) => {
  const { data } = await api.post(`/plantillas/${clave}/prueba`, datos);
  return data;
};
