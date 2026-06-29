import { Router } from 'express';
import {
  crearTransaccion,
  listarTransacciones,
  obtenerResumen,
} from '../controladores/transaccion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken, autorizarRoles('admin', 'cajero'));

router.get('/resumen', obtenerResumen);
router.get('/', listarTransacciones);
router.post('/', crearTransaccion);

export default router;
