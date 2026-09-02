import { Router } from 'express';
import {
  crearTransaccion,
  editarTransaccion,
  anularTransaccion,
  listarTransacciones,
  obtenerResumen,
  getResumenSemanal,
  listarRecompensas,
  promocionesAplicables,
} from '../controladores/transaccion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken);

// Catálogo de recompensas (para el canje): admin y recepcionista
router.get('/recompensas', autorizarRoles('admin', 'recepcionista'), listarRecompensas);
// Promociones/bienvenida que el cajero puede elegir para un cliente: admin y recepcionista
router.get('/promociones-aplicables', autorizarRoles('admin', 'recepcionista'), promocionesAplicables);
// Resumen del dashboard: admin y recepcionista
router.get('/resumen', autorizarRoles('admin', 'recepcionista'), obtenerResumen);
// Actividad de los últimos 7 días: admin y recepcionista
router.get('/resumen-semanal', autorizarRoles('admin', 'recepcionista'), getResumenSemanal);
// Listado: admin y recepcionista (historial) y empleado (para el perfil del huésped, siempre filtrado)
router.get('/', autorizarRoles('admin', 'recepcionista', 'empleado'), listarTransacciones);
// Registrar consumo: solo admin y recepcionista
router.post('/', autorizarRoles('admin', 'recepcionista'), crearTransaccion);
// Editar datos seguros (folio y fechas de hospedaje): admin y recepcionista
router.put('/:id', autorizarRoles('admin', 'recepcionista'), editarTransaccion);
// Anular (revierte puntos, deja rastro): admin y recepcionista
router.put('/:id/anular', autorizarRoles('admin', 'recepcionista'), anularTransaccion);

export default router;
