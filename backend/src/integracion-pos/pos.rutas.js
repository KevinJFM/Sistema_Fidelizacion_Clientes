import { Router } from 'express';
import {
  obtenerConfig, guardarConfig, cambiarModo, probarConexion, sincronizarAhora, obtenerEstado,
} from './pos.controlador.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

// Solo el admin gestiona la integración con el POS
router.use(verificarToken, autorizarRoles('admin'));

router.get('/config', obtenerConfig);
router.put('/config', guardarConfig);
router.put('/modo', cambiarModo);
router.post('/probar', probarConexion);
router.post('/sincronizar', sincronizarAhora);
router.get('/estado', obtenerEstado);

export default router;
