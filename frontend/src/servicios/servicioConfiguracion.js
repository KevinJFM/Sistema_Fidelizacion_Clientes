import api from '../api/api';

export const getConfiguracion = async () => {
  const { data } = await api.get('/configuracion');
  return data;
};

export const updateConfiguracion = async (valores) => {
  const { data } = await api.put('/configuracion', valores);
  return data;
};
