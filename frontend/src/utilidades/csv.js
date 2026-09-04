// Genera y descarga un archivo Excel real (.xlsx) con estilos, usando xlsx-js-style.
// Excel lo abre sin el aviso de "el formato y la extensión no coinciden".
// columnas: [{ label, valor: (fila) => valor, formato?: 'formato numérico Excel' }]
// opciones: { hoja, atenuar: (fila)=>bool (fila en gris), totales: [celdas...] (fila final en negrita) }
// La librería se carga bajo demanda (import dinámico) para no pesar en el arranque.
export async function descargarExcel(nombreArchivo, columnas, filas, opciones = {}) {
  const { hoja = 'Datos', atenuar, totales } = opciones;
  const mod = await import('xlsx-js-style');
  const XLSX = mod.utils ? mod : mod.default;

  const borde = { style: 'thin', color: { rgb: 'CCCCCC' } };
  const bordes = { top: borde, bottom: borde, left: borde, right: borde };
  const estiloHeader  = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '0D1BB8' } }, alignment: { vertical: 'center' }, border: bordes };
  const estiloTotales = { font: { bold: true }, fill: { fgColor: { rgb: 'EEF0FC' } }, border: bordes };
  const estiloGris    = { font: { color: { rgb: '9CA3AF' } }, border: bordes };
  const estiloNormal  = { border: bordes };

  // Matriz de valores: encabezado + filas (+ totales).
  const limpio = (v) => (v === null || v === undefined ? '' : v);
  const encabezado = columnas.map((c) => c.label);
  const cuerpo = filas.map((fila) => columnas.map((c) => limpio(c.valor(fila))));
  const aoa = [encabezado, ...cuerpo];
  if (totales) aoa.push(columnas.map((_, i) => limpio(totales[i])));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const totalFilas = aoa.length;

  for (let r = 0; r < totalFilas; r++) {
    const esHeader  = r === 0;
    const esTotales = totales && r === totalFilas - 1;
    const filaDato  = !esHeader && !esTotales ? filas[r - 1] : null;
    const gris = filaDato && atenuar ? atenuar(filaDato) : false;
    for (let c = 0; c < columnas.length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const celda = ws[ref];
      if (!celda) continue;
      celda.s = esHeader ? estiloHeader : esTotales ? estiloTotales : (gris ? estiloGris : estiloNormal);
      // Formato numérico por columna (ej. dinero con 2 decimales), si el valor es número.
      if (!esHeader && columnas[c].formato && typeof celda.v === 'number') celda.z = columnas[c].formato;
    }
  }

  // Ancho aproximado por columna según el contenido más largo.
  ws['!cols'] = columnas.map((c, i) => {
    let max = String(c.label).length;
    for (const fila of aoa.slice(1)) {
      const s = String(limpio(fila[i]));
      if (s.length > max) max = s.length;
    }
    return { wch: Math.min(Math.max(max + 2, 8), 42) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31)); // Excel limita el nombre de hoja a 31
  XLSX.writeFile(wb, nombreArchivo);
}

// Genera y descarga un archivo CSV en el navegador (sin librerías).
// columnas: [{ label, valor: (fila) => valor }]
export function descargarCSV(nombreArchivo, columnas, filas) {
  const sep = ';'; // ';' funciona mejor con Excel en español

  const escapar = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const encabezado = columnas.map((c) => escapar(c.label)).join(sep);
  const cuerpo = filas
    .map((fila) => columnas.map((c) => escapar(c.valor(fila))).join(sep))
    .join('\n');

  // El BOM (﻿) hace que Excel respete los acentos (UTF-8)
  const contenido = '﻿' + encabezado + '\n' + cuerpo;

  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
