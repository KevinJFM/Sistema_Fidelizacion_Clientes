import { Router } from 'express';
import {
  obtenerDepartamentos,
  obtenerDistritosPorDepartamento,
} from '../controladores/ubicacion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Se usan en los formularios de clientes/usuarios (crear/editar)
router.use(verificarToken, autorizarRoles('admin', 'recepcionista'));

router.get('/departamentos', obtenerDepartamentos);
router.get('/distritos', obtenerDistritosPorDepartamento);

export default router;
