import { Router } from 'express';
import {
  obtenerOperadores,
  crearOperador,
  actualizarOperador,
  cambiarEstadoOperador,
  registrarConsumoOperador,
  listarTransaccionesOperador,
} from '../controladores/operador.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Solo admin y recepcionista gestionan operadores turísticos
router.use(verificarToken, autorizarRoles('admin', 'recepcionista'));

// Historial de consumos
router.get('/transacciones', listarTransaccionesOperador);
// Registrar un grupo y otorgar puntos
router.post('/transacciones', registrarConsumoOperador);

// CRUD de operadores
router.get('/', obtenerOperadores);
router.post('/', crearOperador);
router.put('/:id', actualizarOperador);
router.patch('/:id/estado', cambiarEstadoOperador);

export default router;
