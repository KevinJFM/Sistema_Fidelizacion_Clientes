import axios from 'axios';

// Sin VITE_API_URL definido (desarrollo), la API se resuelve contra el MISMO host
// desde el que se abrió el portal. Así funciona con cualquier IP que la red (DHCP)
// le asigne a la PC, sin amarrarlo a una IP fija: si entras por localhost va a
// localhost, y si entras por 192.168.x.x desde el celular va a esa misma IP.
// En producción, VITE_API_URL (.env.production) trae el dominio real y manda.
const baseURL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

const api = axios.create({
  baseURL,
  timeout: 15000,
});

// Adjunta el token del cliente (guardado en localStorage) a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Un 401 cierra sesión y vuelve al login (el portal no usa refresh token). Excepción: en las rutas de acceso un 401 es esperado (código incorrecto) y no debe redirigir.
const RUTAS_ACCESO = ['/portal/login', '/portal/solicitar-codigo', '/portal/verificar-codigo'];
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const esRutaAcceso = RUTAS_ACCESO.some((r) => url.includes(r));
    if (error.response?.status === 401 && !esRutaAcceso) {
      localStorage.removeItem('portal_token');
      localStorage.setItem('sesion_expirada', '1'); // el login mostrará el aviso
      // Mensaje específico del backend (ej. "iniciaste sesión en otro dispositivo")
      localStorage.setItem('sesion_mensaje', error.response?.data?.message || '');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
