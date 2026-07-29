import './Resumen.css';

// Fila de resumen del panel: etiquetas + valores destacados — parte de la UI reutilizable.
// items: [{ etiqueta: 'Registros', valor: 21 }, ...]  (valor puede ser texto, número o nodo)
export default function Resumen({ items = [] }) {
  return (
    <div className="ui-resumen">
      {items.map(({ etiqueta, valor }) => (
        <span key={etiqueta} className="ui-resumen-item">
          {etiqueta}: <strong>{valor}</strong>
        </span>
      ))}
    </div>
  );
}
