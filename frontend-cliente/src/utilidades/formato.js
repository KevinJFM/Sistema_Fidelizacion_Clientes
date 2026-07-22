// Mismo formato/validación de documento que la app y el sistema.

// Formatea un DUI mientras se escribe: 8 dígitos + '-' + 1 dígito  (ej. 12345678-9)
export const formatearDui = (valor) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 9);
  return digitos.length <= 8 ? digitos : `${digitos.slice(0, 8)}-${digitos.slice(8)}`;
};

// Formatea un pasaporte: letras y números en mayúscula (sin espacios), máx. 12
export const formatearPasaporte = (valor) =>
  valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);

// Aplica el formato correcto según el tipo de documento
export const formatearDocumento = (tipo, valor) =>
  tipo === 'Pasaporte' ? formatearPasaporte(valor) : formatearDui(valor);

// Validadores de formato completo
export const esDuiValido       = (valor) => /^\d{8}-\d$/.test(valor);
export const esPasaporteValido = (valor) => /^[A-Z0-9]{6,12}$/.test(valor);
