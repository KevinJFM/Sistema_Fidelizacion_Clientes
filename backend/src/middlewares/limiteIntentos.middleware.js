import rateLimit from 'express-rate-limit';

// Limita los intentos de inicio de sesión: 5 intentos por IP cada 15 minutos
export const limitadorInicioSesion = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                   // máximo 5 intentos por ventana
  standardHeaders: true,    // devuelve info del límite en headers RateLimit-*
  legacyHeaders: false,
  // Solo cuentan los intentos fallidos; un login exitoso no gasta el cupo
  skipSuccessfulRequests: true,
  message: {
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  },
});
