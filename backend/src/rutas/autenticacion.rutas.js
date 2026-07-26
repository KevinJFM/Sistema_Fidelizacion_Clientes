import { Router } from 'express';
import { iniciarSesion, registrarUsuario, renovarToken, cerrarSesion } from '../controladores/autenticacion.controlador.js';
import { limitadorInicioSesion, limitadorRefresh } from '../middlewares/limiteIntentos.middleware.js';
import { verificarToken } from '../middlewares/autenticacion.middleware.js';
import { autorizarRoles } from '../middlewares/rol.middleware.js';

const router = Router();

router.post('/login', limitadorInicioSesion, iniciarSesion);
router.post('/register', verificarToken, autorizarRoles('admin'), registrarUsuario);
router.post('/refresh', limitadorRefresh, renovarToken);
router.post('/logout', cerrarSesion);

export default router;
