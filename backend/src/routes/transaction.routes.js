import { Router } from 'express';
import {
  crearTransaccion,
  listarTransacciones,
  getResumen,
} from '../controllers/transaction.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyToken, authorizeRoles('admin', 'cajero'));

router.get('/resumen', getResumen);
router.get('/', listarTransacciones);
router.post('/', crearTransaccion);

export default router;
