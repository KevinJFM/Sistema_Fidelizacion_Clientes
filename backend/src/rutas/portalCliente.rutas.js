import { Router } from 'express';
import { solicitarCodigo, verificarCodigo, misPuntos, misMovimientos, promocionesActivas, registrarToken, borrarToken, cerrarSesionRemota } from '../controladores/portalCliente.controlador.js';
import { verificarToken, autorizarRoles, verificarSesionCliente } from '../middlewares/autenticacion.middleware.js';
import { limitadorInicioSesion } from '../middlewares/limiteIntentos.middleware.js';

const router = Router();

// Público: acceso con código por correo (DUI + código de 6 dígitos)
router.post('/solicitar-codigo', limitadorInicioSesion, solicitarCodigo);
router.post('/verificar-codigo', limitadorInicioSesion, verificarCodigo);

// Protegido: solo el propio cliente (rol 'cliente') y con la sesión vigente de su superficie
const soloCliente = [verificarToken, autorizarRoles('cliente'), verificarSesionCliente];
router.get('/mis-puntos', ...soloCliente, misPuntos);
router.get('/mis-movimientos', ...soloCliente, misMovimientos);
router.get('/promociones', ...soloCliente, promocionesActivas);
router.post('/registrar-token', ...soloCliente, registrarToken);
router.post('/borrar-token', ...soloCliente, borrarToken);
router.post('/cerrar-sesion-remota', ...soloCliente, cerrarSesionRemota);

export default router;
