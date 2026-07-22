import { createContext, useContext, useState, useCallback } from 'react';

// Ícono y color según el tipo (el fondo y el texto salen del tema)
const ACENTOS = {
  error: { color: '#dc2626', tinte: 'rgba(220,38,38,0.12)' },
  exito: { color: '#16a34a', tinte: 'rgba(22,163,74,0.12)' },
  info:  { color: '#E5388A', tinte: 'rgba(229,56,138,0.12)' },
};

const Iconos = {
  error: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  exito: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  info: (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const ContextoAvisos = createContext(() => {});
export const usarAvisos = () => useContext(ContextoAvisos);

export function ProveedorAvisos({ children }) {
  const [aviso, setAviso] = useState(null); // { tipo, titulo, mensaje }

  // mostrarAviso(tipo, titulo, mensaje) — tipo: 'error' | 'exito' | 'info'
  const mostrarAviso = useCallback((tipo, titulo, mensaje) => {
    setAviso({ tipo: tipo || 'info', titulo, mensaje });
  }, []);

  const cerrar = () => setAviso(null);
  const acento = aviso ? (ACENTOS[aviso.tipo] || ACENTOS.info) : ACENTOS.info;

  return (
    <ContextoAvisos.Provider value={mostrarAviso}>
      {children}
      {aviso && (
        <div className="pt-modal-fondo" onClick={cerrar}>
          <div className="pt-modal-cuadro" onClick={(e) => e.stopPropagation()}>
            <div className="pt-modal-circulo" style={{ backgroundColor: acento.tinte, color: acento.color }}>
              {Iconos[aviso.tipo] || Iconos.info}
            </div>
            {aviso.titulo && <h3 className="pt-modal-titulo">{aviso.titulo}</h3>}
            {aviso.mensaje && <p className="pt-modal-mensaje">{aviso.mensaje}</p>}
            <button className="pt-modal-boton" style={{ backgroundColor: acento.color }} onClick={cerrar}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </ContextoAvisos.Provider>
  );
}
