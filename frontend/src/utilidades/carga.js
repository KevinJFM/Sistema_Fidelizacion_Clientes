// Asegura que una operación tarde AL MENOS `minimoMs` para que el skeleton se alcance a ver.
// Si los datos llegan más rápido, espera hasta el mínimo; si tardan más, no agrega tiempo extra.
export const conMinimo = async (promesa, minimoMs = 500) => {
  const [resultado] = await Promise.all([
    Promise.resolve(promesa),
    new Promise((r) => setTimeout(r, minimoMs)),
  ]);
  return resultado;
};

// Mensaje de error amigable: distingue "sin conexión" de un error del servidor.
export const mensajeError = (err, fallback = 'Ocurrió un error') => {
  if (err?.response) return err.response.data?.message || fallback;
  // Sin respuesta del servidor = problema de red / servidor caído
  return 'No se pudo conectar. Revisa tu conexión a internet.';
};
