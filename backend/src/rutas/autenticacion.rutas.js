import { Router } from 'express';
import { iniciarSesion, registrarUsuario, renovarToken, cerrarSesion } from '../controladores/autenticacion.controlador.js';
import { limitadorInicioSesion } from '../middlewares/limiteIntentos.middleware.js';

const router = Router();

router.post('/login', limitadorInicioSesion, iniciarSesion);
router.post('/register', registrarUsuario);
router.post('/refresh', renovarToken);
router.post('/logout', cerrarSesion);

export default router;
