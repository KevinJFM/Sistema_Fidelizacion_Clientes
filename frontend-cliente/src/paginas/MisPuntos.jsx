import { useEffect, useState } from 'react';
import { getMisPuntos, getMisMovimientos, mensajeError } from '../servicios/servicioPortal';
import { usarAvisos } from '../componentes/Avisos';

const fmtFecha = (f) => {
  if (!f) return '';
  const d = new Date(f);
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MisPuntos() {
  const mostrarAviso = usarAvisos();
  const [datos, setDatos] = useState(null);
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('recompensas'); // 'recompensas' | 'historial'

  const cargar = () => {
    setCargando(true);
    Promise.all([getMisPuntos(), getMisMovimientos()])
      .then(([p, m]) => { setDatos(p); setMovs(m); })
      .catch((err) => mostrarAviso('error', 'No se pudo cargar', mensajeError(err, 'No se pudieron cargar tus puntos')))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) {
    return <div className="pt-centro"><div className="pt-spinner" /><p className="pt-tenue">Cargando tus puntos…</p></div>;
  }
  if (!datos) {
    return (
      <div className="pt-centro">
        <p className="pt-tenue">No se pudieron cargar tus datos.</p>
        <button className="pt-btn pt-btn-corto" onClick={cargar}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="pt-pagina pt-inicio">
      <div className="pt-inicio-izq">
      <div className="pt-encabezado">
        <p className="pt-hola">Hola,</p>
        <h2 className="pt-nombre">{datos.nombres} {datos.apellidos}</h2>
      </div>

      {/* Tarjeta de puntos */}
      <section className="pt-puntos-card">
        <p className="pt-puntos-label">Tus puntos</p>
        <p className="pt-puntos-num">{datos.puntos_acumulados}</p>
        <div className="pt-puntos-reglas">
          <span className="pt-regla-ficha">$1 = 1 punto</span>
        </div>
        <p className="pt-doc">{datos.tipo_documento}: {datos.numero_documento}</p>
      </section>
      </div>

      <div className="pt-inicio-der">
      {/* Tabs */}
      <div className="pt-tabs">
        <button className={tab === 'recompensas' ? 'activo' : ''} onClick={() => setTab('recompensas')}>Recompensas</button>
        <button className={tab === 'historial' ? 'activo' : ''} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {tab === 'recompensas' && (
        <section className="pt-lista">
          <div className="pt-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l1-5h16l1 5" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 22V12h6v10" />
            </svg>
            <span>El canje de puntos se realiza en recepción del hotel.</span>
          </div>
          {datos.recompensas.map((r) => (
            <div key={r.id} className={`pt-recompensa ${r.alcanzable ? 'ok' : ''}`}>
              <div className="pt-recompensa-info">
                <p className="pt-recompensa-nombre">{r.nombre}</p>
                <p className="pt-recompensa-sub">
                  {r.puntos} pts{r.tipo ? <span className="pt-recompensa-tipo"> · Habitación {r.tipo}</span> : null}
                </p>
              </div>
              {r.alcanzable
                ? <span className="pt-badge ok">¡Ya puedes!</span>
                : <span className="pt-badge">Faltan {r.faltan}</span>}
            </div>
          ))}
        </section>
      )}

      {tab === 'historial' && (
        <section className="pt-lista">
          {movs.length === 0 ? (
            <p className="pt-vacio">Aún no tienes movimientos.</p>
          ) : (
            movs.map((m) => (
              <div key={m.id_movimiento} className="pt-mov">
                <div>
                  <p className="pt-mov-desc">{m.descripcion || (m.tipo === 'ganado' ? 'Puntos ganados' : m.tipo === 'canjeado' ? 'Canje' : 'Ajuste')}</p>
                  <p className="pt-mov-fecha">{fmtFecha(m.fecha)}</p>
                </div>
                <span className={`pt-mov-pts ${Number(m.puntos) < 0 ? 'neg' : 'pos'}`}>
                  {Number(m.puntos) > 0 ? '+' : ''}{m.puntos}
                </span>
              </div>
            ))
          )}
        </section>
      )}
      </div>
    </div>
  );
}
