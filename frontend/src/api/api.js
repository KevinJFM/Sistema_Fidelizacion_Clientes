import axios from 'axios';
import { store } from '../redux/store';
import { setCredentials, expirarSesion } from '../redux/slices/sliceAuth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // envía/recibe la cookie httpOnly del refresh token
  timeout: 15000,        // si el backend no responde en 15s, falla (evita spinner infinito)
});

// Adjunta el access token (en memoria/Redux) a cada petición
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== Manejo de 401: refrescar el access token automáticamente =====
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const debeRefrescar =
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.includes('/auth/refresh') &&
      !original.url.includes('/auth/login');

    if (!debeRefrescar) {
      return Promise.reject(error);
    }

    // Si ya hay un refresh en curso, esperamos a que termine
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post('/auth/refresh');
      store.dispatch(setCredentials(data));
      processQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      store.dispatch(expirarSesion()); // refresh falló → sesión vencida (avisa en el login)
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
