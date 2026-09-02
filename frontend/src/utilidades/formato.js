// Formatea un DUI mientras se escribe: 8 dígitos + '-' + 1 dígito  (ej. 12345678-9)
export const formatDui = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 9);
  return d.length <= 8 ? d : `${d.slice(0, 8)}-${d.slice(8)}`;
};

// Formatea un teléfono salvadoreño mientras se escribe: 4 dígitos + '-' + 4 dígitos (ej. 4322-2334)
export const formatTelefono = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
};

// Formatea un teléfono extranjero: solo dígitos, hasta 15 (estándar E.164). Sin máscara,
// porque cada país tiene su propia longitud/estructura.
export const formatTelefonoInternacional = (valor) =>
  valor.replace(/\D/g, '').slice(0, 15);

// Aplica el formato de teléfono correcto según el país (El Salvador usa la máscara local).
export const formatTelefonoPais = (pais, valor) =>
  pais === 'El Salvador' ? formatTelefono(valor) : formatTelefonoInternacional(valor);

// Formatea un pasaporte mientras se escribe: letras y números en mayúscula (sin espacios), máx. 12
export const formatPasaporte = (valor) =>
  valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);

// Aplica el formato correcto según el tipo de documento seleccionado
export const formatDocumento = (tipo, valor) =>
  tipo === 'Pasaporte' ? formatPasaporte(valor) : formatDui(valor);

// Validadores de formato completo
export const esDuiValido       = (v) => /^\d{8}-\d$/.test(v);
export const esPasaporteValido = (v) => /^[A-Z0-9]{6,12}$/.test(v);
export const esTelefonoValido  = (v) => /^\d{4}-\d{4}$/.test(v);
// Teléfono extranjero: entre 6 y 15 dígitos (E.164), sin contar el código de país.
export const esTelefonoInternacionalValido = (v) => /^\d{6,15}$/.test(v);
// Valida el teléfono según el país (El Salvador exige el formato local 4322-2334).
export const esTelefonoPaisValido = (pais, v) =>
  pais === 'El Salvador' ? esTelefonoValido(v) : esTelefonoInternacionalValido(v);
export const esCorreoValido    = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
