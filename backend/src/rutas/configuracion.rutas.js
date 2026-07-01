import { Router } from 'express';
import {
  obtenerConfiguracion,
  actualizarConfiguracion,
} from '../controladores/configuracion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Solo el admin puede ver y cambiar la configuración
router.use(verificarToken, autorizarRoles('admin'));

router.get('/', obtenerConfiguracion);
router.put('/', actualizarConfiguracion);

export default router;
