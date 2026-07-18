import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El portal del cliente corre en el puerto 5174 para no chocar
// con el panel del personal (5173) cuando ambos estén en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
});
