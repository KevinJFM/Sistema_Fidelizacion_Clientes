import api from '../api/api';

// Configuración de conexión (sin la contraseña)
export const getPosConfig = async () => {
  const { data } = await api.get('/pos/config');
  return data;
};

// Guarda host/puerto/usuario/password/base_datos
export const savePosConfig = async (datos) => {
  const { data } = await api.put('/pos/config', datos);
  return data;
};

// Cambia el modo: 'automatico' | 'manual'
export const setPosModo = async (modo) => {
  const { data } = await api.put('/pos/modo', { modo });
  return data;
};

// Prueba la conexión (responde { ok, mensaje })
export const probarPos = async (datos) => {
  const { data } = await api.post('/pos/probar', datos);
  return data;
};

// Corre la sincronización ahora mismo
export const sincronizarPos = async () => {
  const { data } = await api.post('/pos/sincronizar');
  return data;
};

// Resumen (modo, transacciones creadas, sin cliente, última sincronización)
export const getPosEstado = async () => {
  const { data } = await api.get('/pos/estado');
  return data;
};
