import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuth: false,
    user: null,
    token: null,          // access token: solo en memoria (no localStorage)
    bootstrapped: false,  // ya se intentó restaurar la sesión al cargar
  },
  reducers: {
    setCredentials: (state, action) => {
      state.isAuth = true;
      state.user   = action.payload.usuario;
      state.token  = action.payload.token;
    },
    logout: (state) => {
      state.isAuth = false;
      state.user   = null;
      state.token  = null;
    },
    setBootstrapped: (state) => {
      state.bootstrapped = true;
    },
  },
});

export const { setCredentials, logout, setBootstrapped } = authSlice.actions;
export default authSlice.reducer;
