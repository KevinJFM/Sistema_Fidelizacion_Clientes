import { Router } from 'express';
import {
  listarPlantillas,
  actualizarPlantilla,
  previsualizarPlantilla,
  enviarPruebaPlantilla,
} from '../controladores/plantillas.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Solo el admin gestiona las plantillas de correo (igual que la configuración).
router.use(verificarToken, autorizarRoles('admin'));

router.get('/', listarPlantillas);
router.put('/:clave', actualizarPlantilla);
router.post('/:clave/preview', previsualizarPlantilla);
router.post('/:clave/prueba', enviarPruebaPlantilla);

export default router;
