import './Campo.css';

// Campo reutilizable del panel (input o select) — hermano de <Boton>.
//   as="select" -> renderiza <select> (pásale las <option> como children)
//   as="input"  -> (por defecto) renderiza <input>
//   label       -> etiqueta opcional arriba del campo (como los filtros de fecha)
// Acepta cualquier prop nativa del control (value, onChange, type, placeholder, disabled, etc.).
export default function Campo({ as = 'input', label, className = '', children, ...props }) {
  const control = as === 'select' ? (
    <select className={`ui-campo ui-campo--select ${className}`.trim()} {...props}>
      {children}
    </select>
  ) : (
    <input className={`ui-campo ${className}`.trim()} {...props} />
  );

  if (!label) return control;
  return (
    <label className="ui-campo-grupo">
      <span className="ui-campo-label">{label}</span>
      {control}
    </label>
  );
}
