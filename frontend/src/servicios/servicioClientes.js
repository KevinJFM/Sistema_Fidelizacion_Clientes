import api from '../api/api';

export const getClientes = async () => {
  const { data } = await api.get('/clientes');
  return data;
};

export const buscarCliente = async (id_tipo_documento, numero_documento) => {
  const { data } = await api.get('/clientes/buscar', {
    params: { id_tipo_documento, numero_documento },
  });
  return data;
};

export const buscarClientesPorNombre = async (nombre) => {
  const { data } = await api.get('/clientes/buscar-nombre', { params: { nombre } });
  return data;
};

export const createCliente = async (cliente) => {
  const { data } = await api.post('/clientes', cliente);
  return data;
};

export const updateCliente = async (id, cliente) => {
  const { data } = await api.put(`/clientes/${id}`, cliente);
  return data;
};

export const deleteCliente = async (id) => {
  const { data } = await api.delete(`/clientes/${id}`);
  return data;
};
