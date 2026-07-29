import './Boton.css';

// Botón reutilizable del panel.
//   variant="marco"    -> borde + letra azul de marca (mismo look que "Conectar" de Integración POS)
//   variant="primario" -> relleno azul (para acciones principales)
// Acepta cualquier prop de <button> (onClick, type, disabled, etc.) y children (íconos + texto).
export default function Boton({ variant = 'marco', className = '', children, ...props }) {
  return (
    <button className={`ui-boton ui-boton--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
