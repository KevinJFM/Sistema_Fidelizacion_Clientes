import { describe, it, expect } from 'vitest';
import { calcularBeneficios, DOLARES_POR_PUNTO } from '../../src/dominio/reglasPuntos.js';

// Configuración de referencia con TODAS las reglas encendidas, para probar
// cada prioridad. Los tests que necesiten reglas apagadas pasan su propia config.
const CONFIG_TODO_ACTIVO = {
  bienvenidaPuntos: 20,
  bienvenidaDescuento: 2,
  bienvenidaActivo: true,
};

describe('calcularBeneficios — regla base (1 punto por $1)', () => {
  it('otorga 1 punto por cada dólar en una compra normal', () => {
    const r = calcularBeneficios({ monto: 50 });
    expect(r.puntosBase).toBe(50);
    expect(r.puntosOtorgados).toBe(50);
    expect(r.puntosCanjeados).toBe(0);
    expect(r.descuento).toBe(0);
    expect(r.quiereCanjear).toBe(false);
    expect(r.promocionesAplicadas).toEqual([]);
  });

  it('redondea hacia abajo los puntos (piso) con montos decimales', () => {
    expect(calcularBeneficios({ monto: 49.9 }).puntosOtorgados).toBe(49);
    expect(calcularBeneficios({ monto: 0.99 }).puntosOtorgados).toBe(0);
  });

  it('la regla fija es 1 punto = $1', () => {
    expect(DOLARES_POR_PUNTO).toBe(1);
  });
});

describe('calcularBeneficios — bienvenida (primera compra)', () => {
  it('suma los puntos de bienvenida y aplica el descuento fijo en la primera compra', () => {
    const r = calcularBeneficios({
      monto: 10,
      esPrimeraCompra: true,
      config: CONFIG_TODO_ACTIVO,
    });
    expect(r.aplicaBienvenida).toBe(true);
    expect(r.puntosBase).toBe(10);
    expect(r.puntosExtraBienvenida).toBe(20);
    expect(r.puntosOtorgados).toBe(30); // 10 base + 20 bienvenida
    expect(r.descuento).toBe(2);
    expect(r.promocionesAplicadas).toContain('Bienvenida (primera compra)');
  });

  it('NO aplica bienvenida si no es la primera compra', () => {
    const r = calcularBeneficios({
      monto: 10,
      esPrimeraCompra: false,
      config: CONFIG_TODO_ACTIVO,
    });
    expect(r.aplicaBienvenida).toBe(false);
    expect(r.puntosExtraBienvenida).toBe(0);
    expect(r.puntosOtorgados).toBe(10);
  });

  it('NO aplica bienvenida si la regla está apagada, aunque sea primera compra', () => {
    const r = calcularBeneficios({
      monto: 10,
      esPrimeraCompra: true,
      config: { ...CONFIG_TODO_ACTIVO, bienvenidaActivo: false },
    });
    expect(r.aplicaBienvenida).toBe(false);
    expect(r.puntosOtorgados).toBe(10);
    expect(r.descuento).toBe(0);
  });
});

describe('calcularBeneficios — promoción / fecha especial', () => {
  it('suma los puntos extra de la promoción y aplica el descuento porcentual', () => {
    const r = calcularBeneficios({
      monto: 100,
      promocion: { nombre: 'Aniversario', puntos_extra: 15, descuento_extra: 10 },
      config: { ...CONFIG_TODO_ACTIVO, bienvenidaActivo: false },
    });
    expect(r.puntosExtraPromocion).toBe(15);
    expect(r.puntosOtorgados).toBe(115); // 100 base + 15 promo
    expect(r.descuento).toBeCloseTo(10, 5); // 10% de 100
    expect(r.promocionesAplicadas).toContain('Promoción: Aniversario');
  });
});

describe('calcularBeneficios — prioridad del descuento (uno solo)', () => {
  it('la bienvenida gana a la promoción en el descuento (pero los puntos sí se acumulan)', () => {
    const r = calcularBeneficios({
      monto: 100,
      esPrimeraCompra: true,
      promocion: { nombre: 'Promo', puntos_extra: 15, descuento_extra: 50 },
      config: CONFIG_TODO_ACTIVO,
    });
    // Descuento: manda la bienvenida ($2), NO el 50% de la promoción.
    expect(r.descuento).toBe(2);
    // Puntos: se acumulan base + bienvenida + promoción.
    expect(r.puntosOtorgados).toBe(100 + 20 + 15);
    expect(r.promocionesAplicadas).toContain('Bienvenida (primera compra)');
    expect(r.promocionesAplicadas).toContain('Promoción: Promo');
  });

  it('aplica el descuento porcentual de la promoción cuando no hay bienvenida', () => {
    const r = calcularBeneficios({
      monto: 100,
      esPrimeraCompra: false,
      promocion: { nombre: 'Promo', puntos_extra: 0, descuento_extra: 5 },
      config: CONFIG_TODO_ACTIVO,
    });
    expect(r.descuento).toBeCloseTo(5, 5); // 5% de 100
  });
});

describe('calcularBeneficios — canje de puntos', () => {
  it('canjea la recompensa: resta puntos, no otorga puntos ni descuento en $', () => {
    const r = calcularBeneficios({
      monto: 200,
      saldoPuntos: 1000,
      esPrimeraCompra: true, // aunque sea primera compra y haya promo, el canje manda
      promocion: { nombre: 'Promo', puntos_extra: 50, descuento_extra: 20 },
      recompensa: { nombre: 'Pasanoche', puntos: 700 },
      config: CONFIG_TODO_ACTIVO,
    });
    expect(r.quiereCanjear).toBe(true);
    expect(r.puntosCanjeados).toBe(700);
    expect(r.puntosBase).toBe(0);
    expect(r.puntosOtorgados).toBe(0);
    expect(r.descuento).toBe(0);
    expect(r.promocionesAplicadas).toEqual(['Canje: Pasanoche']);
  });

  it('si el saldo NO alcanza, no canjea y se comporta como compra normal', () => {
    const r = calcularBeneficios({
      monto: 50,
      saldoPuntos: 100,
      recompensa: { nombre: 'Pasanoche', puntos: 700 },
    });
    expect(r.quiereCanjear).toBe(false);
    expect(r.puntosCanjeados).toBe(0);
    expect(r.puntosOtorgados).toBe(50); // gana puntos normalmente
  });
});

describe('calcularBeneficios — el descuento nunca supera el monto', () => {
  it('recorta el descuento de bienvenida al monto de la compra', () => {
    const r = calcularBeneficios({
      monto: 1.5,
      esPrimeraCompra: true,
      config: CONFIG_TODO_ACTIVO, // bienvenidaDescuento = 2 > monto 1.5
    });
    expect(r.descuento).toBe(1.5);
  });
});
