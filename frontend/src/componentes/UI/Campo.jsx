import './Campo.css';

// Campo reutilizable (input o select, hermano de <Boton>): as="select"|"input", label opcional arriba. Acepta cualquier prop nativa del control.
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
