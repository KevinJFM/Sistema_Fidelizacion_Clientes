// Formatea un DUI mientras se escribe: 8 dígitos + '-' + 1 dígito  (ej. 12345678-9)
export const formatDui = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 9);
  return d.length <= 8 ? d : `${d.slice(0, 8)}-${d.slice(8)}`;
};

// Formatea un teléfono mientras se escribe: 4 dígitos + '-' + 4 dígitos  (ej. 4322-2334)
export const formatTelefono = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
};

// Validadores de formato completo
export const esDuiValido      = (v) => /^\d{8}-\d$/.test(v);
export const esTelefonoValido = (v) => /^\d{4}-\d{4}$/.test(v);
export const esCorreoValido   = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
