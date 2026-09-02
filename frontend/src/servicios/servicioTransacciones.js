import api from '../api/api';

export const crearTransaccion = async (transaccion) => {
  const { data } = await api.post('/transacciones', transaccion);
  return data;
};

// Editar solo datos seguros: folio/referencia y fechas de hospedaje (no toca puntos).
export const editarTransaccion = async (id, datos) => {
  const { data } = await api.put(`/transacciones/${id}`, datos);
  return data;
};

// Anular: revierte los puntos y deja rastro. Requiere motivo.
export const anularTransaccion = async (id, motivo) => {
  const { data } = await api.put(`/transacciones/${id}/anular`, { motivo });
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

// Promociones/bienvenida que el cajero puede elegir para un cliente (para el select).
export const getPromocionesAplicables = async (idCliente) => {
  const { data } = await api.get('/transacciones/promociones-aplicables', { params: { id_cliente: idCliente } });
  return data;
};

export const getResumenSemanal = async () => {
  const { data } = await api.get('/transacciones/resumen-semanal');
  return data;
};
