import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getMisPuntos, getMisMovimientos, mensajeError } from '../servicios/servicioPortal';

const fmtFecha = (f) => {
  if (!f) return '';
  const d = new Date(f);
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MisPuntos() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('recompensas'); // 'recompensas' | 'historial'

  useEffect(() => {
    Promise.all([getMisPuntos(), getMisMovimientos()])
      .then(([p, m]) => {
        setDatos(p);
        setMovs(m);
      })
      .catch((err) => toast.error(mensajeError(err, 'No se pudieron cargar tus puntos')))
      .finally(() => setCargando(false));
  }, []);

  const salir = () => {
    localStorage.removeItem('portal_token');
    navigate('/login', { replace: true });
  };

  if (cargando) {
    return (
      <div className="pt-app">
        <div className="pt-cargando">
          <div className="pt-spinner" />
          <p>Cargando tus puntos…</p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="pt-app">
        <div className="pt-cargando">
          <p>No se pudieron cargar tus datos.</p>
          <button className="pt-btn" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-app">
      <header className="pt-header">
        <div>
          <p className="pt-hola">Hola,</p>
          <h2 className="pt-nombre">{datos.nombres} {datos.apellidos}</h2>
        </div>
        <button className="pt-salir" onClick={salir}>Salir</button>
      </header>

      {/* Tarjeta de puntos */}
      <section className="pt-puntos-card">
        <p className="pt-puntos-label">Tus puntos</p>
        <p className="pt-puntos-num">{datos.puntos_acumulados}</p>
        <p className="pt-puntos-valor">equivalen a <strong>${datos.valor_en_dinero.toFixed(2)}</strong></p>
        <p className="pt-doc">{datos.tipo_documento}: {datos.numero_documento}</p>
      </section>

      {/* Tabs */}
      <div className="pt-tabs">
        <button className={tab === 'recompensas' ? 'activo' : ''} onClick={() => setTab('recompensas')}>
          Recompensas
        </button>
        <button className={tab === 'historial' ? 'activo' : ''} onClick={() => setTab('historial')}>
          Historial
        </button>
      </div>

      {tab === 'recompensas' && (
        <section className="pt-lista">
          {datos.recompensas.map((r) => (
            <div key={r.id} className={`pt-recompensa ${r.alcanzable ? 'ok' : ''}`}>
              <div className="pt-recompensa-info">
                <p className="pt-recompensa-nombre">{r.nombre}</p>
                <p className="pt-recompensa-sub">
                  {r.puntos} pts · ${r.valor.toFixed(2)}
                </p>
              </div>
              {r.alcanzable ? (
                <span className="pt-badge ok">¡Ya puedes!</span>
              ) : (
                <span className="pt-badge">Faltan {r.faltan}</span>
              )}
            </div>
          ))}
          <p className="pt-aviso">El canje se realiza en recepción del hotel.</p>
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
  );
}
