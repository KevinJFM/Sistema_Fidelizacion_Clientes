import './Boton.css';

// Botón reutilizable: variant="marco" (borde + letra azul) o "primario" (relleno azul). Acepta props de <button> y children.
export default function Boton({ variant = 'marco', className = '', children, ...props }) {
  return (
    <button className={`ui-boton ui-boton--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
