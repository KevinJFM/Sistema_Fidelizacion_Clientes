import { createSlice } from '@reduxjs/toolkit';

const token   = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuth: !!token,
    user:   usuario,
    token:  token,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.isAuth = true;
      state.user   = action.payload.usuario;
      state.token  = action.payload.token;
      localStorage.setItem('token',   action.payload.token);
      localStorage.setItem('usuario', JSON.stringify(action.payload.usuario));
    },
    logout: (state) => {
      state.isAuth = false;
      state.user   = null;
      state.token  = null;
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
