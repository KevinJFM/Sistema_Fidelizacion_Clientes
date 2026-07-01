import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL  = [13, 27, 184];
const VERDE = [22, 163, 74];

// Genera un PDF con encabezado del hotel, tabla y resumen.
// head: [etiquetas]   body: [[fila...]]
export function exportarPDF({ titulo, subtitulo, head, body, resumen, archivo }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto  = doc.internal.pageSize.getHeight();

  // ---- Encabezado (barra azul) ----
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 56, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Punta Diamante', 40, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistema de Fidelización de Clientes', 40, 42);

  // ---- Título y subtítulo ----
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(titulo, 40, 82);

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(subtitulo, 40, 98);
  }

  // ---- Tabla ----
  autoTable(doc, {
    startY: 110,
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

  // ---- Resumen ----
  if (resumen) {
    const y = doc.lastAutoTable.finalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...AZUL);
    doc.text(resumen, 40, y);
  }

  doc.save(archivo);
}

// PDF de historial individual de un cliente (portrait)
export function exportarPDFCliente({ cliente, historial, totales }) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();
  const alto  = doc.internal.pageSize.getHeight();

  // Encabezado
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, ancho, 56, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Punta Diamante', 40, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistema de Fidelización de Clientes', 40, 42);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, ancho - 40, 42, { align: 'right' });

  // Tarjeta del cliente
  doc.setFillColor(238, 240, 252);
  doc.roundedRect(30, 70, ancho - 60, 90, 8, 8, 'F');

  doc.setTextColor(10, 18, 89);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${cliente.nombres} ${cliente.apellidos}`, 46, 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${cliente.tipo_documento}: ${cliente.numero_documento}`, 46, 113);
  if (cliente.telefono) doc.text(`Tel: ${cliente.telefono}`, 46, 128);
  if (cliente.correo)   doc.text(cliente.correo, 46, 143);

  // Stats en la derecha de la tarjeta
  const statsX = ancho - 180;
  const { totalGastado, totalDescuentos, totalPuntos, totalCanjeados } = totales;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...AZUL);
  doc.text(`${cliente.puntos_acumulados}`, statsX, 96);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('puntos actuales', statsX, 110);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...VERDE);
  doc.text(`+${totalPuntos} ganados`, statsX, 132);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${historial.length} transacciones  |  $${totalGastado.toFixed(2)} gastados`, statsX, 148);

  // Tabla de transacciones
  const head = ['#', 'Fecha', 'Hospedaje', 'Folio', 'Promoción', 'Monto', 'Desc.', 'Total', 'Puntos'];
  const body = historial.map((t) => [
    `#${t.id_transaccion}`,
    new Date(t.fecha).toLocaleDateString(),
    (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—') +
      (t.fecha_salida ? ` → ${new Date(t.fecha_salida).toLocaleDateString()}` : ''),
    t.referencia_venta || '—',
    t.nombre_promocion || '—',
    `$${Number(t.monto).toFixed(2)}`,
    `-$${Number(t.descuento_aplicado).toFixed(2)}`,
    `$${(Number(t.monto) - Number(t.descuento_aplicado)).toFixed(2)}`,
    `+${t.puntos_otorgados}${t.puntos_canjeados > 0 ? ` / -${t.puntos_canjeados}` : ''}`,
  ]);

  autoTable(doc, {
    startY: 175,
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
  doc.roundedRect(30, y, ancho - 60, 48, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text(`Total gastado: $${totalGastado.toFixed(2)}`, 46, y + 16);
  doc.text(`Total ahorrado en descuentos: $${totalDescuentos.toFixed(2)}`, 46, y + 30);
  doc.text(`Puntos totales ganados: ${totalPuntos}${totalCanjeados > 0 ? `  |  Canjeados: ${totalCanjeados}` : ''}`, ancho / 2, y + 16, { align: 'center' });
  doc.text(`Puntos actuales: ${cliente.puntos_acumulados}`, ancho - 46, y + 16, { align: 'right' });
  doc.text(`Transacciones: ${historial.length}`, ancho - 46, y + 30, { align: 'right' });

  const nombreArchivo = `perfil_${cliente.numero_documento}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nombreArchivo);
}
