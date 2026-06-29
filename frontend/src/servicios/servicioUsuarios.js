import api from '../api/api';

export const getUsuarios = async () => {
  const { data } = await api.get('/usuarios');
  return data;
};

export const getUsuario = async (id) => {
  const { data } = await api.get(`/usuarios/${id}`);
  return data;
};

export const createUsuario = async (usuario) => {
  const { data } = await api.post('/usuarios', usuario);
  return data;
};

export const updateUsuario = async (id, usuario) => {
  const { data } = await api.put(`/usuarios/${id}`, usuario);
  return data;
};

export const deleteUsuario = async (id) => {
  const { data } = await api.delete(`/usuarios/${id}`);
  return data;
};
