import api from '../api/api';

export const login = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const register = async (userData) => {
  const { data } = await api.post('/auth/register', userData);
  return data;
};

export const refreshSession = async () => {
  const { data } = await api.post('/auth/refresh');
  return data;
};

export const logoutRequest = async () => {
  await api.post('/auth/logout');
};

export const getMyProfile = async () => {
  const { data } = await api.get('/auth/profile');
  return data;
};

export const updateMyProfile = async (formData) => {
  const { data } = await api.put('/auth/profile', formData);
  return data;
};

export const updateMyPassword = async (passwords) => {
  const { data } = await api.put('/auth/change-password', passwords);
  return data;
};

export const deleteAccountAPI = async () => {
  const { data } = await api.delete('/auth/delete-account');
  return data;
};
