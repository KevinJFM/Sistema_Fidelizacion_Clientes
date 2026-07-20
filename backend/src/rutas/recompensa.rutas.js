import { Router } from 'express';
import {
  listarRecompensas,
  listarTodasRecompensas,
  crearRecompensa,
  actualizarRecompensa,
  eliminarRecompensa,
} from '../controladores/recompensa.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();
router.use(verificarToken);

// Activas: para el dropdown en transacciones (todos los roles del panel)
router.get('/', autorizarRoles('admin', 'recepcionista', 'empleado'), listarRecompensas);
// Todas (activas + inactivas): para administrar desde configuración
router.get('/admin', autorizarRoles('admin'), listarTodasRecompensas);
router.post('/', autorizarRoles('admin'), crearRecompensa);
router.put('/:id', autorizarRoles('admin'), actualizarRecompensa);
router.delete('/:id', autorizarRoles('admin'), eliminarRecompensa);

export default router;
