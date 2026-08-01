import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL  = [13, 27, 184];
const VERDE = [22, 163, 74];
const ROSA  = '#E5388A'; // color de marca del logo

// Toma el logo SVG del sidebar, lo recolorea y lo convierte a PNG para incrustarlo en el PDF. Devuelve null si no lo encuentra (el PDF sale igual sin logo).
function obtenerLogoPNG(color = ROSA, px = 200) {
  return new Promise((resolve) => {
    try {
      const original = document.querySelector('svg[aria-label="Punta Diamante"]');
      if (!original) return resolve(null);
      const svg = original.cloneNode(true);
      svg.setAttribute('width', px);
      svg.setAttribute('height', px);
      const g = svg.querySelector('g');
      if (g) g.setAttribute('fill', color);
      const xml = new XMLSerializer().serializeToString(svg);
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = px;
        canvas.height = px;
        canvas.getContext('2d').drawImage(img, 0, 0, px, px);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

// Dibuja la barra teal del encabezado con la insignia del logo y el nombre del hotel.
function dibujarEncabezado(doc, logoPng, ancho) {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 72, 'F');

  // Ícono igual al del sistema: cuadro rosado con el diamante y el texto en hueco (se ve el fondo blanco).
  if (logoPng) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(30, 13, 48, 48, 12, 12, 'F');
    // Recorta el logo a las esquinas redondeadas: roundedRect con estilo null solo traza (sin pintar) para usarlo de máscara con clip().
    doc.saveGraphicsState();
    doc.roundedRect(30, 13, 48, 48, 12, 12, null);
    doc.clip();
    doc.discardPath();
    doc.addImage(logoPng, 'PNG', 30, 13, 48, 48);
    doc.restoreGraphicsState();
  }

  const x = logoPng ? 92 : 40;
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Punta Diamantes', x, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistema de Fidelización de Clientes', x, 51);
}

// Genera un PDF con encabezado del hotel, tabla y resumen.
// head: [etiquetas]   body: [[fila...]]
export async function exportarPDF({ titulo, subtitulo, head, body, resumen, archivo }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto  = doc.internal.pageSize.getHeight();

  // ---- Encabezado (barra azul con logo) ----
  const logo = await obtenerLogoPNG();
  dibujarEncabezado(doc, logo, ancho);

  // ---- Título y subtítulo ----
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, 40, 96);

  if (subtitulo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(subtitulo, 40, 112);
  }

  // ---- Tabla ----
  autoTable(doc, {
    startY: 124,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 4, textColor: 40 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 254] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const pagina = `Página ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(pagina, ancho - 80, alto - 20);
    },
  });

  // ---- Resumen (tarjeta, mismo estilo que el perfil del cliente) ----
  if (resumen) {
    const y = doc.lastAutoTable.finalY + 22;
    doc.setFillColor(238, 240, 252);
    doc.setDrawColor(197, 206, 245);
    doc.setLineWidth(1.5);
    doc.roundedRect(40, y, ancho - 80, 40, 8, 8, 'FD');

    // Divide "Etiqueta: valor    Etiqueta: valor" en segmentos {eti, val}.
    const segmentos = resumen.split(/\s{2,}/).map((p) => {
      const i = p.indexOf(': ');
      return i === -1
        ? { eti: '', val: p }
        : { eti: p.slice(0, i + 2), val: p.slice(i + 2) };
    });

    // Etiqueta en oscuro + valor en azul, centrado en cx.
    const linea = (eti, val, cx, ly) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      let x = cx - (doc.getTextWidth(eti) + doc.getTextWidth(val)) / 2;
      doc.setTextColor(17, 24, 39);
      doc.text(eti, x, ly);
      x += doc.getTextWidth(eti);
      doc.setTextColor(...AZUL);
      doc.text(val, x, ly);
    };

    const celda = (ancho - 80) / segmentos.length;
    segmentos.forEach((s, i) => linea(s.eti, s.val, 40 + celda * (i + 0.5), y + 25));
  }

  doc.save(archivo);
}

// PDF de historial individual de un cliente (portrait)
export async function exportarPDFCliente({ cliente, historial, totales }) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto  = doc.internal.pageSize.getHeight();

  // Encabezado (barra azul con logo)
  const logo = await obtenerLogoPNG();
  dibujarEncabezado(doc, logo, ancho);
  doc.setTextColor(255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, ancho - 40, 46, { align: 'right' });

  // Tarjeta del cliente
  doc.setFillColor(238, 240, 252);
  doc.setDrawColor(197, 206, 245);
  doc.setLineWidth(1.5);
  doc.roundedRect(30, 86, ancho - 60, 108, 8, 8, 'FD');

  doc.setTextColor(10, 18, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${cliente.nombres} ${cliente.apellidos}`, 46, 114);

  // Documento: etiqueta normal + número en negrita
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  const etiquetaDoc = `${cliente.tipo_documento}: `;
  doc.text(etiquetaDoc, 46, 133);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`${cliente.numero_documento}`, 46 + doc.getTextWidth(etiquetaDoc), 133);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  if (cliente.telefono) doc.text(`Tel: ${cliente.telefono}`, 46, 150);
  if (cliente.correo)   doc.text(`Correo: ${cliente.correo}`, 46, 167);

  // Stats en la derecha de la tarjeta
  const statsX = ancho - 235;
  const { totalGastado, totalDescuentos, totalPuntos, totalCanjeados } = totales;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...AZUL);
  doc.text(`${cliente.puntos_acumulados}`, statsX, 114);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text('puntos actuales', statsX, 130);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...VERDE);
  doc.text(`+${totalPuntos} ganados`, statsX, 154);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`${historial.length} transacciones  |  $${totalGastado.toFixed(2)} gastados`, statsX, 170);

  // Tabla de transacciones
  const head = ['#', 'Fecha', 'Hospedaje', 'Promoción', 'Monto', 'Desc.', 'Total', 'Puntos'];
  const body = historial.map((t) => [
    `#${t.id_transaccion}`,
    new Date(t.fecha).toLocaleDateString(),
    (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—') +
      (t.fecha_salida ? ` a ${new Date(t.fecha_salida).toLocaleDateString()}` : ''),
    t.nombre_promocion || '—',
    `$${Number(t.monto).toFixed(2)}`,
    `-$${Number(t.descuento_aplicado).toFixed(2)}`,
    `$${(Number(t.monto) - Number(t.descuento_aplicado)).toFixed(2)}`,
    `+${t.puntos_otorgados}${t.puntos_canjeados > 0 ? ` / -${t.puntos_canjeados}` : ''}`,
  ]);

  autoTable(doc, {
    startY: 208,
    head: [head],
    body,
    styles: { fontSize: 8, cellPadding: 4, textColor: 40 },
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 254] },
    margin: { left: 30, right: 30 },
    didDrawPage: () => {
      const pagina = `Página ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(pagina, ancho - 40, alto - 20, { align: 'right' });
    },
  });

  // Resumen final
  const y = doc.lastAutoTable.finalY + 20;
  doc.setFillColor(238, 240, 252);
  doc.setDrawColor(197, 206, 245);
  doc.setLineWidth(1.5);
  doc.roundedRect(30, y, ancho - 60, 56, 8, 8, 'FD');

  // Dibuja una línea de segmentos { eti, val }: etiqueta en negrita oscura, valor en azul.
  const linea = (segmentos, x, ly, align = 'left') => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const total = segmentos.reduce(
      (s, { eti, val }) => s + doc.getTextWidth(eti) + doc.getTextWidth(val), 0);
    let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    segmentos.forEach(({ eti, val }) => {
      doc.setTextColor(17, 24, 39);
      doc.text(eti, cx, ly);
      cx += doc.getTextWidth(eti);
      doc.setTextColor(...AZUL);
      doc.text(val, cx, ly);
      cx += doc.getTextWidth(val);
    });
  };

  linea([{ eti: 'Total gastado: ', val: `$${totalGastado.toFixed(2)}` }], 46, y + 22);
  linea([{ eti: 'Total ahorrado en descuentos: ', val: `$${totalDescuentos.toFixed(2)}` }], 46, y + 40);
  linea([
    { eti: 'Puntos totales ganados: ', val: `${totalPuntos}` },
    ...(totalCanjeados > 0 ? [{ eti: '  |  Canjeados: ', val: `${totalCanjeados}` }] : []),
  ], ancho / 2, y + 22, 'center');
  linea([{ eti: 'Puntos actuales: ', val: `${cliente.puntos_acumulados}` }], ancho - 46, y + 22, 'right');
  linea([{ eti: 'Transacciones: ', val: `${historial.length}` }], ancho - 46, y + 40, 'right');

  const nombreArchivo = `perfil_${cliente.numero_documento}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
