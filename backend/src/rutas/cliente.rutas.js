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

router.use(verificarToken);

// Buscar por documento: admin, recepcionista y empleado (para consultar el perfil)
router.get('/buscar', autorizarRoles('admin', 'recepcionista', 'empleado'), buscarClientePorDocumento);

// Gestión de clientes: solo admin y recepcionista
router.get('/', autorizarRoles('admin', 'recepcionista'), obtenerClientes);
router.post('/', autorizarRoles('admin', 'recepcionista'), crearCliente);
router.put('/:id', autorizarRoles('admin', 'recepcionista'), actualizarCliente);
router.delete('/:id', autorizarRoles('admin', 'recepcionista'), eliminarCliente);

export default router;
