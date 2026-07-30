import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../backend');

// Puertos AISLADOS para E2E (no chocan con desarrollo: back 4000 / portal 5174).
const BACK_PORT = 4100;
const FRONT_PORT = 5198;
const FRONT_URL = `http://localhost:${FRONT_PORT}`;

// El backend E2E apunta a la BD separada db_fidelizacion_e2e y desactiva el
// correo (CORREO_* vacías → no se envían emails de verdad). El resto de la
// config (MySQL, JWT) la toma de backend/.env.
const backendEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(BACK_PORT),
  DB_NAME: 'db_fidelizacion_e2e',
  CLIENT_URL: FRONT_URL,
  CORREO_USUARIO: '',
  CORREO_CLAVE: '',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
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

  webServer: [
    {
      // Siembra la BD E2E (incluye un cliente con código OTP conocido) y arranca el backend.
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
      // Portal del cliente en modo e2e (usa .env.e2e → API en el puerto 4100).
      command: `pnpm exec vite --mode e2e --port ${FRONT_PORT} --strictPort`,
      cwd: __dirname,
      url: FRONT_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
