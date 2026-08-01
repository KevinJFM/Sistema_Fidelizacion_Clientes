import rateLimit from 'express-rate-limit';

// En pruebas (NODE_ENV=test) se desactiva el límite (las suites hacen muchas peticiones). Activo en dev y producción.
const saltarEnPruebas = () => process.env.NODE_ENV === 'test';

// Limita los intentos de inicio de sesión: 5 intentos por IP cada 15 minutos
export const limitadorInicioSesion = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                   // máximo 5 intentos por ventana
  standardHeaders: true,    // devuelve info del límite en headers RateLimit-*
  legacyHeaders: false,
  // Solo cuentan los intentos fallidos; un login exitoso no gasta el cupo
  skipSuccessfulRequests: true,
  skip: saltarEnPruebas,
  message: {
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  },
});

// Limita /auth/refresh: 30 renovaciones por IP cada 15 min (evita abuso/DoS).
export const limitadorRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: saltarEnPruebas,
  message: { message: 'Demasiadas renovaciones de sesión. Intenta más tarde.' },
});
