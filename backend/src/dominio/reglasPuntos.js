// ============================================================
//  MOTOR DE REGLAS DE PUNTOS Y DESCUENTOS  (lógica de negocio PURA)
//
//  Este módulo NO toca la base de datos: recibe todo lo que necesita
//  como parámetros y devuelve el resultado del cálculo. Así la lógica
//  de fidelización se puede probar de forma unitaria (rápida y
//  determinista) sin depender de MySQL.
//
//  El controlador de transacciones se encarga de leer/escribir en la BD
//  y le delega a este módulo el "cuánto se gana / cuánto se descuenta".
// ============================================================

// Regla FIJA del sistema (no editable): ganar $1 de consumo = 1 punto.
// (El valor del punto $0.05 y el catálogo de canje viven en recompensas.js)
export const DOLARES_POR_PUNTO = 1; // 1 punto por cada $1

/**
 * Calcula los puntos y el descuento de una transacción aplicando el
 * MOTOR DE REGLAS POR PRIORIDAD:
 *   - Los PUNTOS se acumulan (base + bienvenida + promoción).
 *   - El DESCUENTO es uno solo, por prioridad:
 *       1. Canje de puntos (bloquea cualquier otro descuento y no otorga puntos)
 *       2. Bienvenida (primera compra)
 *       3. Promoción / fecha especial
 *       4. Descuento por compra alta (monto mínimo)
 *   - El descuento nunca supera el monto de la compra.
 *
 * @param {Object}  params
 * @param {number}  params.monto            Monto de la compra en dólares.
 * @param {number}  [params.saldoPuntos=0]  Puntos que el cliente ya tiene acumulados.
 * @param {boolean} [params.esPrimeraCompra=false] Si es la primera transacción del cliente.
 * @param {Object|null} [params.promocion=null]    Promoción vigente aplicable
 *        ({ nombre, puntos_extra, descuento_extra }) o null si no hay.
 * @param {Object|null} [params.recompensa=null]   Recompensa a canjear
 *        ({ nombre, puntos }) o null si no se canjea.
 * @param {Object}  [params.config={}]      Reglas configurables:
 *        { bienvenidaPuntos, bienvenidaDescuento, descuentoMontoMinimo,
 *          descuentoMontoValor, bienvenidaActivo, descuentoMontoActivo }
 * @returns {{
 *   quiereCanjear: boolean,
 *   aplicaBienvenida: boolean,
 *   puntosBase: number,
 *   puntosExtraBienvenida: number,
 *   puntosExtraPromocion: number,
 *   puntosOtorgados: number,
 *   puntosCanjeados: number,
 *   descuento: number,
 *   promocionesAplicadas: string[]
 * }}
 */
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
    descuentoMontoMinimo = 0,
    descuentoMontoValor = 0,
    bienvenidaActivo = false,
    descuentoMontoActivo = false,
  } = config;

  const promocionesAplicadas = [];
  let puntosExtraBienvenida = 0;
  let puntosExtraPromocion = 0;
  let puntosOtorgados = 0;
  let descuento = 0;
  let puntosCanjeados = 0;

  // El cliente canjea solo si eligió una recompensa Y tiene puntos suficientes.
  const quiereCanjear = !!recompensa && saldoPuntos >= recompensa.puntos;
  const aplicaBienvenida = !!bienvenidaActivo && !!esPrimeraCompra;

  // Puntos base (regla fija): 1 punto por cada $1 de consumo. En un canje NO se ganan puntos.
  const puntosBase = quiereCanjear ? 0 : Math.floor(montoNumerico / DOLARES_POR_PUNTO);

  if (quiereCanjear) {
    // CANJE: el cliente usa su beneficio (premio). No gana puntos nuevos ni recibe
    // descuento en $. Paga el monto completo y se le descuentan los puntos del premio.
    puntosCanjeados = recompensa.puntos;
    promocionesAplicadas.push(`Canje: ${recompensa.nombre}`);
  } else {
    // Flujo normal: acumula puntos (base + bienvenida + promoción) y aplica UN descuento por prioridad.
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
    } else if (descuentoMontoActivo && montoNumerico >= descuentoMontoMinimo) {
      descuento = Number(descuentoMontoValor);
      promocionesAplicadas.push('Descuento por compra alta');
    }
  }

  // El descuento nunca puede superar el monto de la compra.
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
