import "dotenv/config";
import app from "./aplicacion.js";
import { iniciarTareasProgramadas } from "./tareas/promociones.tarea.js";
import { iniciarIntegracionPos } from "./integracion-pos/pos.servicio.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  // Aviso diario de las promociones que arrancan cada día
  iniciarTareasProgramadas();
  // Integración con el POS: arranca el poller si el modo está en "automático"
  iniciarIntegracionPos();
});
