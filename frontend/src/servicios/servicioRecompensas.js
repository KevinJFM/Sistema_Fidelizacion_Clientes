import api from '../api/api';

export const getRecompensas = async () => {
  const { data } = await api.get('/recompensas');
  return data;
};

export const getTodasRecompensas = async () => {
  const { data } = await api.get('/recompensas/admin');
  return data;
};

export const crearRecompensa = async (recompensa) => {
  const { data } = await api.post('/recompensas', recompensa);
  return data;
};

export const actualizarRecompensa = async (id, recompensa) => {
  const { data } = await api.put(`/recompensas/${id}`, recompensa);
  return data;
};

export const eliminarRecompensa = async (id) => {
  const { data } = await api.delete(`/recompensas/${id}`);
  return data;
};
