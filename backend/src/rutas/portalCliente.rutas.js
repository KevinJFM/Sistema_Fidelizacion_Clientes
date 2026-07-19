import { Router } from 'express';
import { loginCliente, misPuntos, misMovimientos, promocionesActivas } from '../controladores/portalCliente.controlador.js';
import { verificarToken, autorizarRoles } from '../middlewares/autenticacion.middleware.js';
import { limitadorInicioSesion } from '../middlewares/limiteIntentos.middleware.js';

const router = Router();

// Público: login del cliente (con límite de intentos)
router.post('/login', limitadorInicioSesion, loginCliente);

// Protegido: solo el propio cliente (rol 'cliente')
router.get('/mis-puntos', verificarToken, autorizarRoles('cliente'), misPuntos);
router.get('/mis-movimientos', verificarToken, autorizarRoles('cliente'), misMovimientos);
router.get('/promociones', verificarToken, autorizarRoles('cliente'), promocionesActivas);

export default router;
