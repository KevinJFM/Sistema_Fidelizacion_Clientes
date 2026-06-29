import api from '../api/api';

export const getDepartamentos = async () => {
  const { data } = await api.get('/ubicaciones/departamentos');
  return data;
};

export const getDistritos = async (idDepartamento) => {
  const { data } = await api.get('/ubicaciones/distritos', {
    params: { id_departamento: idDepartamento },
  });
  return data;
};
