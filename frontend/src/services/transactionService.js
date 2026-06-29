import api from '../api/api';

export const crearTransaccion = async (transaccion) => {
  const { data } = await api.post('/transacciones', transaccion);
  return data;
};

export const listarTransacciones = async (filtros = {}) => {
  const { data } = await api.get('/transacciones', { params: filtros });
  return data;
};

export const getResumen = async () => {
  const { data } = await api.get('/transacciones/resumen');
  return data;
};
