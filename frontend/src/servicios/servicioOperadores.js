import api from '../api/api';

export const getOperadores = async () => {
  const { data } = await api.get('/operadores');
  return data;
};

export const createOperador = async (operador) => {
  const { data } = await api.post('/operadores', operador);
  return data;
};

export const updateOperador = async (id, operador) => {
  const { data } = await api.put(`/operadores/${id}`, operador);
  return data;
};

export const toggleEstadoOperador = async (id) => {
  const { data } = await api.patch(`/operadores/${id}/estado`);
  return data;
};

export const registrarConsumoOperador = async (payload) => {
  const { data } = await api.post('/operadores/transacciones', payload);
  return data;
};

export const canjearOperador = async (payload) => {
  const { data } = await api.post('/operadores/canje', payload);
  return data;
};

export const listarTransaccionesOperador = async (filtros = {}) => {
  const { data } = await api.get('/operadores/transacciones', { params: filtros });
  return data;
};
