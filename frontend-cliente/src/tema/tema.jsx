import { createContext, useContext, useEffect, useState } from 'react';

// El tema se aplica poniendo data-tema="oscuro" en <html>; los colores viven como
// variables CSS en portal.css (:root y :root[data-tema="oscuro"]).
const ContextoTema = createContext({ oscuro: false, alternarTema: () => {} });

const aplicar = (oscuro) => {
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
};

export function ProveedorTema({ children }) {
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('portal_tema') === 'oscuro');

  useEffect(() => { aplicar(oscuro); }, [oscuro]);

  const alternarTema = () => {
    setOscuro((valor) => {
      const nuevo = !valor;
      localStorage.setItem('portal_tema', nuevo ? 'oscuro' : 'claro');
      return nuevo;
    });
  };

  return (
    <ContextoTema.Provider value={{ oscuro, alternarTema }}>
      {children}
    </ContextoTema.Provider>
  );
}

export const usarTema = () => useContext(ContextoTema);
