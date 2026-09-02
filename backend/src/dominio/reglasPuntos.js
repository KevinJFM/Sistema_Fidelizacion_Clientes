// Motor de reglas de puntos/descuentos: lógica pura (no toca la BD), recibe parámetros y devuelve el cálculo. El controlador de transacciones persiste y le delega el "cuánto se gana/descuenta".

// Regla fija: $1 de consumo = 1 punto. El valor del punto y el catálogo de canje viven en recompensas.js.
export const DOLARES_POR_PUNTO = 1;

// Calcula puntos y descuento de una transacción. Los puntos se acumulan (base + bienvenida + promoción); el descuento es uno solo por prioridad: canje > bienvenida > promoción, y nunca supera el monto.
export function calcularBeneficios({
  monto,
  saldoPuntos = 0,
  esPrimeraCompra = false,
  promocion = null,
  recompensa = null,
  config = {},
} = {}) {
  const montoNumerico = Number(monto);

  const {
    bienvenidaPuntos = 0,
    bienvenidaDescuento = 0,
    bienvenidaActivo = false,
  } = config;

  const promocionesAplicadas = [];
  let puntosExtraBienvenida = 0;
  let puntosExtraPromocion = 0;
  let puntosOtorgados = 0;
  let descuento = 0;
  let puntosCanjeados = 0;

  // Solo canjea si eligió recompensa y tiene puntos suficientes.
  const quiereCanjear = !!recompensa && saldoPuntos >= recompensa.puntos;
  const aplicaBienvenida = !!bienvenidaActivo && !!esPrimeraCompra;

  // Puntos base: 1 por cada $1. En un canje no se ganan puntos.
  const puntosBase = quiereCanjear ? 0 : Math.floor(montoNumerico / DOLARES_POR_PUNTO);

  if (quiereCanjear) {
    // Canje: paga el monto completo, no gana puntos ni descuento, se le restan los puntos del premio.
    puntosCanjeados = recompensa.puntos;
    promocionesAplicadas.push(`Canje: ${recompensa.nombre}`);
  } else {
    // Flujo normal: acumula puntos y aplica un descuento por prioridad.
    puntosOtorgados = puntosBase;
    if (aplicaBienvenida) {
      puntosExtraBienvenida = Number(bienvenidaPuntos);
      puntosOtorgados += puntosExtraBienvenida;
      promocionesAplicadas.push('Bienvenida (primera compra)');
    }
    if (promocion) {
      puntosExtraPromocion = Number(promocion.puntos_extra);
      puntosOtorgados += puntosExtraPromocion;
      promocionesAplicadas.push(`Promoción: ${promocion.nombre}`);
    }

    if (aplicaBienvenida) {
      descuento = Number(bienvenidaDescuento);
    } else if (promocion) {
      descuento = (Number(promocion.descuento_extra) / 100) * montoNumerico;
    }
  }

  // El descuento nunca supera el monto de la compra.
  if (descuento > montoNumerico) descuento = montoNumerico;

  return {
    quiereCanjear,
    aplicaBienvenida,
    puntosBase,
    puntosExtraBienvenida,
    puntosExtraPromocion,
    puntosOtorgados,
    puntosCanjeados,
    descuento,
    promocionesAplicadas,
  };
}
