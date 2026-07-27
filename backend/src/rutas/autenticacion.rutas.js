import rateLimit from 'express-rate-limit';
import { Router } from 'express';
import { iniciarSesion, registrarUsuario, renovarToken, cerrarSesion } from '../controladores/autenticacion.controlador.js';
import { limitadorInicioSesion } from '../middlewares/limiteIntentos.middleware.js';

const router = Router();

const limitadorRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas renovaciones de sesión. Intenta en 15 minutos.' },
});

router.post('/login', limitadorInicioSesion, iniciarSesion);
router.post('/register', registrarUsuario);
router.post('/refresh', limitadorRefresh, renovarToken);
router.post('/logout', cerrarSesion);

export default router;
