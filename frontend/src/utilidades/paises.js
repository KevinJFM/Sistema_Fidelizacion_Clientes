// Catálogo curado de países (fuente única) para el selector de cliente extranjero.
// Cada país trae su bandera, su nombre (lo que se guarda en la BD) y su código de
// marcación telefónica. La lista está centrada en los mercados del hotel: Centroamérica,
// Norteamérica y los países de donde más llegan huéspedes. Si algún día se necesita
// validación telefónica exhaustiva de todos los países, ahí se evaluaría libphonenumber-js.
export const PAISES = [
  { nombre: 'El Salvador',    bandera: '🇸🇻', codigo: '+503' },
  { nombre: 'Guatemala',      bandera: '🇬🇹', codigo: '+502' },
  { nombre: 'Honduras',       bandera: '🇭🇳', codigo: '+504' },
  { nombre: 'Nicaragua',      bandera: '🇳🇮', codigo: '+505' },
  { nombre: 'Costa Rica',     bandera: '🇨🇷', codigo: '+506' },
  { nombre: 'Panamá',         bandera: '🇵🇦', codigo: '+507' },
  { nombre: 'Belice',         bandera: '🇧🇿', codigo: '+501' },
  { nombre: 'México',         bandera: '🇲🇽', codigo: '+52'  },
  { nombre: 'Estados Unidos', bandera: '🇺🇸', codigo: '+1'   },
  { nombre: 'Canadá',         bandera: '🇨🇦', codigo: '+1'   },
  { nombre: 'Colombia',       bandera: '🇨🇴', codigo: '+57'  },
  { nombre: 'Argentina',      bandera: '🇦🇷', codigo: '+54'  },
  { nombre: 'Brasil',         bandera: '🇧🇷', codigo: '+55'  },
  { nombre: 'España',         bandera: '🇪🇸', codigo: '+34'  },
  { nombre: 'Francia',        bandera: '🇫🇷', codigo: '+33'  },
  { nombre: 'Alemania',       bandera: '🇩🇪', codigo: '+49'  },
  { nombre: 'Italia',         bandera: '🇮🇹', codigo: '+39'  },
  { nombre: 'Reino Unido',    bandera: '🇬🇧', codigo: '+44'  },
];

export const PAIS_POR_DEFECTO = 'El Salvador';

// Devuelve el país por su nombre (el valor guardado en la BD). Si no está en la lista
// (dato viejo o vacío), cae en El Salvador para no romper el formato/visualización.
export const getPais = (nombre) =>
  PAISES.find((p) => p.nombre === nombre) || PAISES[0];

// Código de marcación de un país (ej. '+503'). Útil para mostrar el teléfono completo.
export const codigoDe = (nombre) => getPais(nombre).codigo;

// Formatea un teléfono para mostrarlo con su código: "+503 4322-2334".
// Si no hay teléfono, devuelve cadena vacía.
export const telefonoConCodigo = (telefono, pais) =>
  telefono ? `${codigoDe(pais)} ${telefono}` : '';
