import { Router } from 'express';
import {
  crearTransaccion,
  listarTransacciones,
  obtenerResumen,
} from '../controladores/transaccion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken);

// Resumen del dashboard: admin y recepcionista
router.get('/resumen', autorizarRoles('admin', 'recepcionista'), obtenerResumen);
// Listado: admin y recepcionista (historial) y empleado (para el perfil del huésped, siempre filtrado)
router.get('/', autorizarRoles('admin', 'recepcionista', 'empleado'), listarTransacciones);
// Registrar consumo: solo admin y recepcionista
router.post('/', autorizarRoles('admin', 'recepcionista'), crearTransaccion);

export default router;
