import { Router } from 'express';
import {
  obtenerClientes,
  buscarClientePorDocumento,
  buscarClientesPorNombre,
  getTopClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  reenviarCodigoAcceso,
} from '../controladores/cliente.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.use(verificarToken);

// Buscar por documento: admin, recepcionista y empleado (para consultar el perfil)
router.get('/buscar', autorizarRoles('admin', 'recepcionista', 'empleado'), buscarClientePorDocumento);
// Buscar por nombre/apellido: devuelve lista de coincidencias
router.get('/buscar-nombre', autorizarRoles('admin', 'recepcionista', 'empleado'), buscarClientesPorNombre);
// Top 5 clientes con más puntos (dashboard)
router.get('/top', autorizarRoles('admin', 'recepcionista'), getTopClientes);

// Gestión de clientes: solo admin y recepcionista
router.get('/', autorizarRoles('admin', 'recepcionista'), obtenerClientes);
router.post('/', autorizarRoles('admin', 'recepcionista'), crearCliente);
router.put('/:id', autorizarRoles('admin', 'recepcionista'), actualizarCliente);
router.delete('/:id', autorizarRoles('admin', 'recepcionista'), eliminarCliente);
// Reenviar el código de acceso (OTP) al correo del cliente
router.post('/:id/reenviar-codigo', autorizarRoles('admin', 'recepcionista'), reenviarCodigoAcceso);

export default router;
