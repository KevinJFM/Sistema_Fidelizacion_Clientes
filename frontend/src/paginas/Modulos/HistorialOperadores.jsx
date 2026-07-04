import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransaccionesOperador, getOperadores } from '../../servicios/servicioOperadores';
import { exportarPDF } from '../../utilidades/pdf';
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
  const totalMontos = Number(t.monto_habitaciones) + Number(t.monto_consumo);
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

        {/* Montos */}
        <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 16px', margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#6b7280' }}>Habitaciones</span>
            <span style={{ fontWeight: 600 }}>${Number(t.monto_habitaciones).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
            <span style={{ color: '#6b7280' }}>Consumo</span>
            <span style={{ fontWeight: 600 }}>${Number(t.monto_consumo).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
            <span style={{ fontWeight: 700, color: '#0A1259' }}>Total</span>
            <span style={{ fontWeight: 800, color: '#0D1BB8', fontSize: 18 }}>${totalMontos.toFixed(2)}</span>
          </div>
        </div>

        {/* Puntos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Puntos por personas</span>
            <strong>{Number(t.puntos_personas).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: '#6b7280' }}>Puntos por habitaciones + consumo</span>
            <strong>{Number(t.puntos_consumo).toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <span style={{ fontWeight: 700, color: '#0A1259' }}>Puntos otorgados</span>
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
  const [operadores, setOperadores] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtros, setFiltros]     = useState({ id_operador: '', desde: '', hasta: '' });
  const [detalle, setDetalle]     = useState(null);

  const cargar = async (f = {}) => {
    setCargando(true);
    try {
      setHistorial(await listarTransaccionesOperador(f));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    getOperadores().then(setOperadores).catch(() => {});
    const op = searchParams.get('op');
    if (op) {
      setFiltros((f) => ({ ...f, id_operador: op }));
      cargar({ id_operador: op });
    } else {
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    const f = {};
    if (filtros.id_operador) f.id_operador = filtros.id_operador;
    if (filtros.desde) f.desde = filtros.desde;
    if (filtros.hasta) f.hasta = filtros.hasta;
    cargar(f);
  };

  const limpiar = () => {
    setFiltros({ id_operador: '', desde: '', hasta: '' });
    cargar();
  };

  const totalPersonas = historial.reduce((s, t) => s + Number(t.num_personas), 0);
  const totalMontos   = historial.reduce((s, t) => s + Number(t.monto_habitaciones) + Number(t.monto_consumo), 0);
  const totalPuntos   = historial.reduce((s, t) => s + Number(t.puntos_otorgados), 0);

  const exportarPdf = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const head = ['Operador', 'Correo', 'Personas', 'Habitaciones', 'Consumo', 'Puntos', 'Registrado por', 'Fecha'];
    const body = historial.map((t) => [
      t.operador,
      t.correo || '—',
      String(t.num_personas),
      `$${Number(t.monto_habitaciones).toFixed(2)}`,
      `$${Number(t.monto_consumo).toFixed(2)}`,
      `+${Number(t.puntos_otorgados).toFixed(2)}`,
      t.registrado_por,
      new Date(t.fecha).toLocaleDateString(),
    ]);

    const opSel = operadores.find((o) => String(o.id_operador) === String(filtros.id_operador));
    const titulo = opSel ? `Historial de ${opSel.nombre}` : 'Historial de Tour Operadores';

    const sub = [`Generado: ${new Date().toLocaleString()}`];
    if (opSel) sub.push(`Operador: ${opSel.nombre}`);
    if (filtros.desde) sub.push(`Desde: ${filtros.desde}`);
    if (filtros.hasta) sub.push(`Hasta: ${filtros.hasta}`);

    const resumen = `Registros: ${historial.length}    Personas: ${totalPersonas}    Montos: $${totalMontos.toFixed(2)}    Puntos otorgados: ${totalPuntos.toFixed(2)}`;
    const sufijo = opSel ? `_${opSel.nombre.replace(/\s+/g, '_').toLowerCase()}` : '_todos';

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
          value={filtros.id_operador}
          onChange={(e) => setFiltros({ ...filtros, id_operador: e.target.value })}
        >
          <option value="">Todos los operadores</option>
          {operadores.map((o) => <option key={o.id_operador} value={o.id_operador}>{o.nombre}</option>)}
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
        <span>Montos: <strong>${totalMontos.toFixed(2)}</strong></span>
        <span>Puntos otorgados: <strong>{totalPuntos.toFixed(2)}</strong></span>
      </div>

      <div className="table-card">
        {cargando ? (
          <p className="table-empty">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="table-empty">No hay registros con esos filtros</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Operador</th>
                <th>Correo</th>
                <th>Personas</th>
                <th>Habitaciones</th>
                <th>Consumo</th>
                <th>Puntos</th>
                <th>Registrado por</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historial.map((t) => (
                <tr key={t.id_transaccion_op}>
                  <td><strong>{t.operador}</strong></td>
                  <td>{t.correo || '—'}</td>
                  <td>{t.num_personas}</td>
                  <td>${Number(t.monto_habitaciones).toFixed(2)}</td>
                  <td>${Number(t.monto_consumo).toFixed(2)}</td>
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

      <ModalDetalleOperador t={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
