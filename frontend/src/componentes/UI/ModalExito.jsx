import { useEffect, useRef } from 'react';
import './ModalExito.css';

// Modal de éxito con check verde que se muestra un momento y se cierra solo.
// Mismo estilo que la confirmación de transacción, reutilizable en cualquier formulario.
export default function ModalExito({ mensaje, duracion = 1400, onCerrar }) {
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    const id = setTimeout(() => cerrarRef.current(), duracion);
    return () => clearTimeout(id);
  }, [duracion]);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="exito-modal" onClick={(e) => e.stopPropagation()}>
        <div className="exito-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="exito-titulo">{mensaje}</h3>
      </div>
    </div>
  );
}
