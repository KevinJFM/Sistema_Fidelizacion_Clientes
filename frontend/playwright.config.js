import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../backend');

// Puertos AISLADOS para E2E (no chocan con los de desarrollo: back 4000 / front 5173).
const BACK_PORT = 4100;
const FRONT_PORT = 5199;
const FRONT_URL = `http://localhost:${FRONT_PORT}`;

// Variables de entorno para el backend E2E. Apuntan a una BD separada
// (db_fidelizacion_e2e) y al origen del frontend E2E para el CORS.
// El resto (credenciales de MySQL, secretos JWT) las toma del backend/.env.
const backendEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(BACK_PORT),
  DB_NAME: 'db_fidelizacion_e2e',
  CLIENT_URL: FRONT_URL,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // un solo flujo contra una sola BD
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: FRONT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Playwright levanta AMBOS servidores antes de correr las pruebas y los apaga al terminar.
  webServer: [
    {
      // Siembra la BD E2E en limpio y luego arranca el backend.
      command: 'node test/helpers/seedE2E.js && node src/servidor.js',
      cwd: backendDir,
      url: `http://localhost:${BACK_PORT}/`,
      env: backendEnv,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Frontend en modo e2e (usa .env.e2e → API en el puerto 4100).
      command: `pnpm exec vite --mode e2e --port ${FRONT_PORT} --strictPort`,
      cwd: __dirname,
      url: FRONT_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
