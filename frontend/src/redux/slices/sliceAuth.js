import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuth: false,
    user: null,
    token: null,          // access token: solo en memoria (no localStorage)
    bootstrapped: false,  // ya se intentó restaurar la sesión al cargar
    posHabilitado: false, // el backend decide si se ve el módulo Integración POS
    sesionExpirada: false, // true solo cuando la sesión venció sola (no logout manual)
  },
  reducers: {
    setCredentials: (state, action) => {
      state.isAuth = true;
      state.user   = action.payload.usuario;
      state.token  = action.payload.token;
      state.posHabilitado = action.payload.posHabilitado === true;
      state.sesionExpirada = false; // al entrar de nuevo, se limpia cualquier aviso
    },
    logout: (state) => {
      state.isAuth = false;
      state.user   = null;
      state.token  = null;
      state.posHabilitado = false;
    },
    // Como logout, pero marca que la sesión venció sola: el login mostrará el aviso.
    expirarSesion: (state) => {
      state.isAuth = false;
      state.user   = null;
      state.token  = null;
      state.posHabilitado = false;
      state.sesionExpirada = true;
    },
    // El login la llama tras mostrar el aviso, para que no se repita.
    limpiarSesionExpirada: (state) => {
      state.sesionExpirada = false;
    },
    setBootstrapped: (state) => {
      state.bootstrapped = true;
    },
  },
});

export const { setCredentials, logout, expirarSesion, limpiarSesionExpirada, setBootstrapped } = authSlice.actions;
export default authSlice.reducer;
