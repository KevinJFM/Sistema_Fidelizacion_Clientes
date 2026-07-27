import "dotenv/config";
import app from "./aplicacion.js";
import { iniciarTareasProgramadas } from "./tareas/promociones.tarea.js";
import { iniciarTareasClientes } from "./tareas/clientes.tarea.js";
import { iniciarIntegracionPos } from "./integracion-pos/pos.servicio.js";

// Falla al arrancar si faltan variables de entorno críticas de seguridad.
// Mejor fallar aquí con un mensaje claro que en producción en el primer request.
const VARS_REQUERIDAS = ['JWT_SECRET', 'JWT_EXPIRES_IN', 'REFRESH_SECRET', 'REFRESH_EXPIRES_IN', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const faltantes = VARS_REQUERIDAS.filter((v) => !process.env[v]);
if (faltantes.length > 0) {
  console.error(`[ERROR] Variables de entorno requeridas no configuradas: ${faltantes.join(', ')}`);
  console.error('        Revisa tu archivo .env y el .env.example como guía.');
  process.exit(1);
}

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  // Aviso diario de las promociones que arrancan cada día (8:00 AM El Salvador)
  iniciarTareasProgramadas();
  // Alertas de retención de clientes: cerca del canje + reactivación (9:00 AM El Salvador)
  iniciarTareasClientes();
  // Integración con el POS: arranca el poller si el modo está en "automático"
  iniciarIntegracionPos();
});
