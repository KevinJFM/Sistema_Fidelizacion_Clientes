import "dotenv/config";
import app from "./aplicacion.js";
import { iniciarTareasProgramadas } from "./tareas/promociones.tarea.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  // Aviso diario de las promociones que arrancan cada día
  iniciarTareasProgramadas();
});
