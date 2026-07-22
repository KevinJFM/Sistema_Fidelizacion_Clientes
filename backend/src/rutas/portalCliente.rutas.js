import { Router } from 'express';
import { loginCliente, solicitarCodigo, verificarCodigo, misPuntos, misMovimientos, promocionesActivas, registrarToken, borrarToken } from '../controladores/portalCliente.controlador.js';
import { verificarToken, autorizarRoles } from '../middlewares/autenticacion.middleware.js';
import { limitadorInicioSesion } from '../middlewares/limiteIntentos.middleware.js';

const router = Router();

// Público: acceso con código por correo (DUI + código de 6 dígitos)
router.post('/solicitar-codigo', limitadorInicioSesion, solicitarCodigo);
router.post('/verificar-codigo', limitadorInicioSesion, verificarCodigo);

// Público: login del cliente por PIN (lo usa el portal web; con límite de intentos)
router.post('/login', limitadorInicioSesion, loginCliente);

// Protegido: solo el propio cliente (rol 'cliente')
router.get('/mis-puntos', verificarToken, autorizarRoles('cliente'), misPuntos);
router.get('/mis-movimientos', verificarToken, autorizarRoles('cliente'), misMovimientos);
router.get('/promociones', verificarToken, autorizarRoles('cliente'), promocionesActivas);
router.post('/registrar-token', verificarToken, autorizarRoles('cliente'), registrarToken);
router.post('/borrar-token', verificarToken, autorizarRoles('cliente'), borrarToken);

export default router;
