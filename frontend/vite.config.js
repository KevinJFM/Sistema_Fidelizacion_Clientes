import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // En producción el backend (Express) sirve el panel en el mismo origen.
    // Compilamos directamente en backend/public para que el build viaje con
    // el despliegue del backend (Hostinger despliega solo la carpeta backend).
    outDir: path.resolve(__dirname, "../backend/public"),
    emptyOutDir: true,
  },
});
