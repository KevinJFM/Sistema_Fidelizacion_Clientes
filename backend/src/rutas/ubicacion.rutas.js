import { Router } from 'express';
import {
  obtenerDepartamentos,
  obtenerDistritosPorDepartamento,
} from '../controladores/ubicacion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken, autorizarRoles('admin', 'cajero'));

router.get('/departamentos', obtenerDepartamentos);
router.get('/distritos', obtenerDistritosPorDepartamento);

export default router;
