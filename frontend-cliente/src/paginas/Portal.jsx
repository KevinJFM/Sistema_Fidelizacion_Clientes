import { useState } from 'react';
import CampanaNotificaciones from '../componentes/CampanaNotificaciones';
import MisPuntos from './MisPuntos';
import Promociones from './Promociones';
import Configuracion from './Configuracion';

const PESTANAS = [
  { clave: 'inicio', etiqueta: 'Inicio' },
  { clave: 'promos', etiqueta: 'Promociones' },
  { clave: 'config', etiqueta: 'Configuración' },
];

const Icono = ({ clave, activo }) => {
  const color = activo ? '#E5388A' : 'var(--tenue)';
  const comun = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (clave === 'inicio') return <svg {...comun}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
  if (clave === 'promos') return <svg {...comun}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
  return <svg {...comun}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
};

export default function Portal() {
  const [pestana, setPestana] = useState('inicio');

  return (
    <div className="pt-shell">
      <header className="pt-topbar">
        <span className="pt-topbar-marca">Punta Diamantes</span>
        <CampanaNotificaciones />
      </header>

      <main className="pt-contenido">
        {pestana === 'inicio' && <MisPuntos />}
        {pestana === 'promos' && <Promociones />}
        {pestana === 'config' && <Configuracion />}
      </main>

      <nav className="pt-barra">
        {PESTANAS.map((item) => {
          const activo = pestana === item.clave;
          return (
            <button key={item.clave} className={`pt-barra-item ${activo ? 'activo' : ''}`} onClick={() => setPestana(item.clave)}>
              <Icono clave={item.clave} activo={activo} />
              <span>{item.etiqueta}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
