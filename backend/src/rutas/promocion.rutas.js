import { Router } from 'express';
import {
  obtenerPromociones, crearPromocion, actualizarPromocion, togglePromocion, eliminarPromocion,
} from '../controladores/promocion.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { esAdmin } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken, esAdmin);

router.get('/', obtenerPromociones);
router.post('/', crearPromocion);
router.put('/:id', actualizarPromocion);
router.patch('/:id/toggle', togglePromocion);
router.delete('/:id', eliminarPromocion);

export default router;
