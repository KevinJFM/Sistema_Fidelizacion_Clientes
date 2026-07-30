// setupFiles de las pruebas de integración: se ejecuta en cada worker ANTES de
// que corra cada archivo de test. Fija el entorno de prueba (BD separada) y, al
// terminar el archivo, cierra el pool de conexiones para que Vitest pueda salir.
import './env.js';
import { afterAll } from 'vitest';
import pool from '../../src/configuracion/bd.js';

afterAll(async () => {
  await pool.end();
});
