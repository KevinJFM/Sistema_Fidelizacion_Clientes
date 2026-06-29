import { Router } from 'express';
import {
  obtenerClientes,
  buscarClientePorDocumento,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} from '../controladores/cliente.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Admin y cajero/recepcionista pueden gestionar clientes
router.use(verificarToken, autorizarRoles('admin', 'cajero'));

router.get('/', obtenerClientes);
router.get('/buscar', buscarClientePorDocumento);
router.post('/', crearCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

export default router;
