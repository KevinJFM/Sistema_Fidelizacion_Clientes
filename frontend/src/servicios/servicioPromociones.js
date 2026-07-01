import api from '../api/api';

export const getPromociones = async () => {
  const { data } = await api.get('/promociones');
  return data;
};

export const createPromocion = async (promocion) => {
  const { data } = await api.post('/promociones', promocion);
  return data;
};

export const updatePromocion = async (id, promocion) => {
  const { data } = await api.put(`/promociones/${id}`, promocion);
  return data;
};

export const togglePromocion = async (id) => {
  const { data } = await api.patch(`/promociones/${id}/toggle`);
  return data;
};

export const deletePromocion = async (id) => {
  const { data } = await api.delete(`/promociones/${id}`);
  return data;
};
