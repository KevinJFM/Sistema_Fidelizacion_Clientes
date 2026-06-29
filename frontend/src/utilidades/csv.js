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
