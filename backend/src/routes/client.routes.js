import { Router } from 'express';
import {
  getClientes,
  getClienteByDocumento,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../controllers/client.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

// Admin y cajero/recepcionista pueden gestionar clientes
router.use(verifyToken, authorizeRoles('admin', 'cajero'));

router.get('/', getClientes);
router.get('/buscar', getClienteByDocumento);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

export default router;
