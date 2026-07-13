import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransaccionesOperador } from '../../servicios/servicioOperadores';
import { exportarPDF } from '../../utilidades/pdf';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import { SkeletonFilas } from '../../componentes/Skeleton/Skeleton';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

const estiloModal = {
  background: '#ffffff',
  borderRadius: 22,
  padding: '28px 32px',
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 30px 70px rgba(6,58,52,0.25)',
  color: '#111827',
};

function ModalDetalleOperador({ t, onClose }) {
  if (!t) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={estiloModal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#0A1259', fontSize: 17, fontWeight: 800 }}>Registro #{t.id_transaccion_op}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Operador */}
        <div style={{ background: '#EEF0FC', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#0A1259', fontSize: 15 }}>{t.operador}</p>
          {t.telefono && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4b5563' }}>Tel: {t.telefono}</p>}
          {t.correo && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4b5563' }}>Correo: {t.correo}</p>}
        </div>

        {/* Detalles */}
        {[
          { label: 'Registrado por', valor: t.registrado_por },
          { label: 'Fecha',          valor: new Date(t.fecha).toLocaleString() },
          { label: 'Personas',       valor: t.num_personas },
        ].map(({ label, valor }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e7eb', fontSize: 14 }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{valor}</span>
          </div>
        ))}

        {/* Puntos (el operador solo gana puntos por persona) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, paddingTop: 4 }}>
            <span style={{ fontWeight: 700, color: '#0A1259' }}>Puntos otorgados (por personas)</span>
            <strong style={{ color: '#16a34a', fontSize: 18 }}>+{Number(t.puntos_otorgados).toFixed(2)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistorialOperadores() {
  const [searchParams] = useSearchParams();
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtros, setFiltros]     = useState({ tipo: '', desde: '', hasta: '' });
  const [detalle, setDetalle]     = useState(null);
  const [page, setPage]           = useState(1);

  const cargar = async (f = {}) => {
    setCargando(true);
    try {
      setHistorial(await conMinimo(listarTransaccionesOperador(f)));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar el historial'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    // Enlace directo desde "Ver historial" de un operador específico
    const op = searchParams.get('op');
    if (op) {
      cargar({ id_operador: op });
    } else {
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    const f = {};
    if (filtros.tipo) f.tipo = filtros.tipo;
    if (filtros.desde) f.desde = filtros.desde;
    if (filtros.hasta) f.hasta = filtros.hasta;
    cargar(f);
  };

  const limpiar = () => {
    setFiltros({ tipo: '', desde: '', hasta: '' });
    cargar();
  };

  const totalPersonas = historial.reduce((s, t) => s + Number(t.num_personas), 0);
  const totalPuntos   = historial.reduce((s, t) => s + Number(t.puntos_otorgados), 0);
  const pageItems = historial.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [historial]); // a la página 1 cuando cambia el resultado

  const exportarPdf = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const head = ['Operador', 'Tipo', 'Correo', 'Personas', 'Puntos', 'Registrado por', 'Fecha'];
    const body = historial.map((t) => [
      t.operador,
      t.tipo || '—',
      t.correo || '—',
      String(t.num_personas),
      `+${Number(t.puntos_otorgados).toFixed(2)}`,
      t.registrado_por,
      new Date(t.fecha).toLocaleDateString(),
    ]);

    const titulo = filtros.tipo
      ? `Historial de Tour Operadores (${filtros.tipo})`
      : 'Historial de Tour Operadores';

    const sub = [`Generado: ${new Date().toLocaleString()}`];
    if (filtros.tipo) sub.push(`Tipo: ${filtros.tipo}`);
    if (filtros.desde) sub.push(`Desde: ${filtros.desde}`);
    if (filtros.hasta) sub.push(`Hasta: ${filtros.hasta}`);

    const resumen = `Registros: ${historial.length}    Personas: ${totalPersonas}    Puntos otorgados: ${totalPuntos.toFixed(2)}`;
    const sufijo = filtros.tipo ? `_${filtros.tipo.replace(/\s+/g, '_').toLowerCase()}` : '_todos';

    exportarPDF({
      titulo,
      subtitulo: sub.join('     |     '),
      head,
      body,
      resumen,
      archivo: `operadores${sufijo}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
    toast.success('PDF generado');
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Historial de Tour Operadores</h2>
      <p className="page-subtitle">Grupos registrados y puntos otorgados por operador</p>

      <form className="filtros-row" onSubmit={aplicarFiltros} style={{ marginBottom: 18 }}>
        <select
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
        >
          <option value="">Todos los operadores</option>
          <option value="Persona natural">Persona natural</option>
          <option value="Empresa">Empresa</option>
        </select>
        <div className="filtro-fecha">
          <label>Desde</label>
          <input type="date" value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
        </div>
        <div className="filtro-fecha">
          <label>Hasta</label>
          <input type="date" value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        <button type="button" className="btn-ghost" onClick={limpiar}>Limpiar</button>
        <button type="button" className="btn-ghost" onClick={exportarPdf} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Exportar PDF
        </button>
      </form>

      <div className="hist-resumen">
        <span>Registros: <strong>{historial.length}</strong></span>
        <span>Personas: <strong>{totalPersonas}</strong></span>
        <span>Puntos otorgados: <strong>{totalPuntos.toFixed(2)}</strong></span>
      </div>

      <div className="table-card">
        {!cargando && historial.length === 0 ? (
          <p className="table-empty">No hay registros con esos filtros</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Operador</th>
                <th>Tipo</th>
                <th>Correo</th>
                <th>Personas</th>
                <th>Puntos</th>
                <th>Registrado por</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <SkeletonFilas columnas={8} filas={8} />
              ) : pageItems.map((t) => (
                <tr key={t.id_transaccion_op}>
                  <td><strong>{t.operador}</strong></td>
                  <td>{t.tipo || '—'}</td>
                  <td>{t.correo || '—'}</td>
                  <td>{t.num_personas}</td>
                  <td><strong style={{ color: '#16a34a' }}>+{Number(t.puntos_otorgados).toFixed(2)}</strong></td>
                  <td>{t.registrado_por}</td>
                  <td><small>{new Date(t.fecha).toLocaleString()}</small></td>
                  <td>
                    <button className="btn-icon-table" title="Ver detalle" onClick={() => setDetalle(t)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Paginacion total={historial.length} page={page} onChange={setPage} />

      <ModalDetalleOperador t={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
