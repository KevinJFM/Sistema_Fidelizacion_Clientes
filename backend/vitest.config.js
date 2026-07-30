import { defineConfig } from 'vitest/config';

// Dos "proyectos" de prueba:
//  - unit:        lógica de negocio PURA (sin BD). Rápidas y deterministas.
//  - integration: endpoints reales de la API contra una BD MySQL de prueba
//                 (db_fidelizacion_test), que se crea en limpio desde el esquema.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['test/integration/**/*.test.js'],
          // Crea la BD de prueba UNA vez, cargando el esquema real de producción.
          globalSetup: ['./test/helpers/globalSetup.js'],
          // Ajusta las variables de entorno (BD de prueba) y cierra el pool al final.
          setupFiles: ['./test/helpers/setupIntegracion.js'],
          // Todos los archivos comparten la misma BD → se corren en serie para
          // que no se pisen entre ellos.
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 30000,
        },
      },
    ],
  },
});
