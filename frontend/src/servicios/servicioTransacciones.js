import api from '../api/api';

export const crearTransaccion = async (transaccion) => {
  const { data } = await api.post('/transacciones', transaccion);
  return data;
};

export const listarTransacciones = async (filtros = {}) => {
  const resp = await api.get('/transacciones', { params: filtros });
  const datos = resp.data; // sigue siendo el arreglo de transacciones
  // El backend avisa por cabecera si recortó el resultado por el tope de seguridad.
  // Lo adjuntamos al arreglo (no lo rompe) para que el Historial pueda mostrar el aviso.
  datos.truncado = resp.headers['x-historial-truncado'] === '1';
  datos.limite = Number(resp.headers['x-historial-limite']) || null;
  return datos;
};

export const getResumen = async () => {
  const { data } = await api.get('/transacciones/resumen');
  return data;
};

export const getRecompensas = async () => {
  const { data } = await api.get('/transacciones/recompensas');
  return data;
};

export const getResumenSemanal = async () => {
  const { data } = await api.get('/transacciones/resumen-semanal');
  return data;
};
