// ============================================================
//  Reglas FIJAS del sistema (no editables desde el panel)
//  - Cada punto vale $0.05 al canjear.
//  - Catálogo de recompensas por las que el cliente canjea puntos.
//    El valor de cada recompensa = puntos × VALOR_PUNTO.
// ============================================================
export const VALOR_PUNTO = 0.05;

export const RECOMPENSAS = [
  { id: 1, nombre: 'Pasanoche (Dom a Jue)',                puntos: 700 },
  { id: 2, nombre: 'Pasadía (Dom a Jue)',                  puntos: 800 },
  { id: 3, nombre: 'Estadía 24h · 2 personas (Dom a Jue)', puntos: 1000 },
  { id: 4, nombre: 'Pasanoche (Vie o Sáb)',                puntos: 800 },
  { id: 5, nombre: 'Pasadía (Vie o Sáb)',                  puntos: 800 },
  { id: 6, nombre: 'Estadía 24h · 2 personas (Vie o Sáb)', puntos: 1200 },
];

// Devuelve la recompensa con su valor calculado ($0.05 por punto)
export const conValor = (r) => ({ ...r, valor: Number((r.puntos * VALOR_PUNTO).toFixed(2)) });

export const buscarRecompensa = (id) => RECOMPENSAS.find((r) => r.id === Number(id)) || null;
