import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL = [13, 27, 184];

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
