import rateLimit from 'express-rate-limit';

// En el entorno de PRUEBAS (NODE_ENV=test) se desactiva el límite de intentos:
// las suites hacen muchas peticiones seguidas desde la misma IP y no queremos que
// el rate-limit las bloquee. En desarrollo y producción sigue plenamente activo.
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

// Limita la renovación de sesión: 30 renovaciones por IP cada 15 minutos.
// Evita abuso/DoS del endpoint /auth/refresh (más que suficiente para uso normal).
export const limitadorRefresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: saltarEnPruebas,
  message: { message: 'Demasiadas renovaciones de sesión. Intenta más tarde.' },
});
