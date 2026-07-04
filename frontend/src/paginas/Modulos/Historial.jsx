import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransacciones } from '../../servicios/servicioTransacciones';
import { descargarCSV } from '../../utilidades/csv';
import { exportarPDF } from '../../utilidades/pdf';
import { formatDocumento } from '../../utilidades/formato';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

const estiloModal = {
  background: '#ffffff',
  borderRadius: 22,
  padding: '28px 32px',
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 30px 70px rgba(10,18,89,0.25)',
  color: '#111827',
};

function ModalDetalle({ t, onClose }) {
  if (!t) return null;
  const totalPagado = Number(t.monto) - Number(t.descuento_aplicado);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={estiloModal} onClick={(e) => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#0A1259', fontSize: 17, fontWeight: 800 }}>
            Transacción #{t.id_transaccion}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Bloque cliente */}
        <div style={{ background: '#EEF0FC', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#0A1259', fontSize: 15 }}>{t.nombres} {t.apellidos}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#4b5563' }}>
            <span style={{ background: '#0D1BB8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginRight: 6 }}>{t.tipo_documento}</span>
            {t.numero_documento}
          </p>
        </div>

        {/* Detalles */}
        {[
          { label: 'Registrado por', valor: t.cajero },
          { label: 'Fecha',          valor: new Date(t.fecha).toLocaleString() },
          (t.fecha_ingreso || t.fecha_salida) ? {
            label: 'Hospedaje',
            valor: `${t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—'}${t.fecha_salida ? ' → ' + new Date(t.fecha_salida).toLocaleDateString() : ''}`,
          } : null,
          { label: 'Folio', valor: t.referencia_venta || '—' },
        ].filter(Boolean).map(({ label, valor }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e7eb', fontSize: 14 }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{valor}</span>
          </div>
        ))}

        {t.nombre_promocion && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e7eb', fontSize: 14 }}>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Promoción</span>
            <span style={{ background: '#EEF0FC', color: '#0D1BB8', fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>{t.nombre_promocion}</span>
          </div>
        )}

        {/* Bloque financiero */}
        <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 16px', margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#6b7280' }}>Monto consumido</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>${Number(t.monto).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
            <span style={{ color: '#6b7280' }}>Descuento aplicado</span>
            <span style={{ fontWeight: 600, color: '#16a34a' }}>-${Number(t.descuento_aplicado).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
            <span style={{ fontWeight: 700, color: '#0A1259' }}>Total pagado</span>
            <span style={{ fontWeight: 800, color: '#0D1BB8', fontSize: 18 }}>${totalPagado.toFixed(2)}</span>
          </div>
        </div>

        {/* Puntos */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#16a34a' }}>+{t.puntos_otorgados}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Puntos otorgados</p>
          </div>
          {t.puntos_canjeados > 0 && (
            <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#dc2626' }}>-{t.puntos_canjeados}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Puntos canjeados</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtros, setFiltros]     = useState({ numero_documento: '', tipo_documento: '', desde: '', hasta: '' });
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [searchParams] = useSearchParams();

  const cargar = async (f = {}) => {
    setCargando(true);
    try {
      setHistorial(await listarTransacciones(f));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const doc = searchParams.get('doc');
    if (doc) {
      setFiltros((f) => ({ ...f, numero_documento: doc }));
      cargar({ numero_documento: doc });
    } else {
      cargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    const f = {};
    if (filtros.numero_documento) f.numero_documento = filtros.numero_documento;
    if (filtros.tipo_documento) f.tipo_documento = filtros.tipo_documento;
    if (filtros.desde) f.desde = filtros.desde;
    if (filtros.hasta) f.hasta = filtros.hasta;
    cargar(f);
  };

  const limpiar = () => {
    setFiltros({ numero_documento: '', tipo_documento: '', desde: '', hasta: '' });
    cargar();
  };

  const exportar = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const columnas = [
      { label: 'Huésped',          valor: (t) => `${t.nombres} ${t.apellidos}` },
      { label: 'Tipo documento',   valor: (t) => t.tipo_documento },
      { label: 'N° documento',     valor: (t) => t.numero_documento },
      { label: 'Teléfono',         valor: (t) => t.telefono || '' },
      { label: 'Correo',           valor: (t) => t.correo || '' },
      { label: 'Fecha ingreso',    valor: (t) => (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '') },
      { label: 'Fecha salida',     valor: (t) => (t.fecha_salida ? new Date(t.fecha_salida).toLocaleDateString() : '') },
      { label: 'Folio',            valor: (t) => t.referencia_venta || '' },
      { label: 'Promoción',        valor: (t) => t.nombre_promocion || '' },
      { label: 'Monto',            valor: (t) => Number(t.monto).toFixed(2) },
      { label: 'Descuento',        valor: (t) => Number(t.descuento_aplicado).toFixed(2) },
      { label: 'Puntos otorgados', valor: (t) => t.puntos_otorgados },
      { label: 'Puntos canjeados', valor: (t) => t.puntos_canjeados },
      { label: 'Cajero',           valor: (t) => t.cajero },
      { label: 'Registrado',       valor: (t) => new Date(t.fecha).toLocaleString() },
    ];
    const sufijo = filtros.numero_documento
      ? `_${filtros.numero_documento}`
      : (filtros.tipo_documento ? `_${filtros.tipo_documento.toLowerCase()}` : '_completo');
    descargarCSV(`historial${sufijo}_${new Date().toISOString().slice(0, 10)}.csv`, columnas, historial);
    toast.success('Historial exportado');
  };

  const exportarPdf = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const head = ['Huésped', 'Documento', 'Teléfono', 'Correo', 'Hospedaje', 'Promoción', 'Monto', 'Desc.', 'Puntos', 'Registrado'];
    const body = historial.map((t) => [
      `${t.nombres} ${t.apellidos}`,
      `${t.tipo_documento}: ${t.numero_documento}`,
      t.telefono || '—',
      t.correo || '—',
      (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—') +
        (t.fecha_salida ? ` a ${new Date(t.fecha_salida).toLocaleDateString()}` : ''),
      t.nombre_promocion || '—',
      `$${Number(t.monto).toFixed(2)}`,
      `$${Number(t.descuento_aplicado).toFixed(2)}`,
      `+${t.puntos_otorgados}${t.puntos_canjeados > 0 ? ` / -${t.puntos_canjeados}` : ''}`,
      new Date(t.fecha).toLocaleDateString(),
    ]);

    const individual = filtros.numero_documento && historial.length > 0;
    const titulo = individual
      ? `Historial de ${historial[0].nombres} ${historial[0].apellidos}`
      : (filtros.tipo_documento
          ? `Historial de transacciones (solo ${filtros.tipo_documento})`
          : 'Historial de transacciones');

    const sub = [`Generado: ${new Date().toLocaleString()}`];
    if (filtros.numero_documento) sub.push(`Documento: ${filtros.numero_documento}`);
    if (filtros.tipo_documento) sub.push(`Tipo: ${filtros.tipo_documento}`);
    if (filtros.desde) sub.push(`Desde: ${filtros.desde}`);
    if (filtros.hasta) sub.push(`Hasta: ${filtros.hasta}`);

    const resumen = `Transacciones: ${historial.length}    Ventas: $${totalVentas.toFixed(2)}    Puntos otorgados: ${totalPuntos}`;
    const sufijo = filtros.numero_documento
      ? `_${filtros.numero_documento}`
      : (filtros.tipo_documento ? `_${filtros.tipo_documento.toLowerCase()}` : '_completo');

    exportarPDF({ titulo, subtitulo: sub.join('     |     '), head, body, resumen,
      archivo: `historial${sufijo}_${new Date().toISOString().slice(0, 10)}.pdf` });
    toast.success('PDF generado');
  };

  const totalVentas = historial.reduce((s, t) => s + Number(t.monto), 0);
  const totalPuntos = historial.reduce((s, t) => s + t.puntos_otorgados, 0);

  return (
    <div className="admin-page">
      <h2 className="page-title">Historial de transacciones</h2>
      <p className="page-subtitle">Consulta de consumos y búsqueda de huéspedes por fecha de hospedaje</p>

      <form className="filtros-row" onSubmit={aplicarFiltros} style={{ marginBottom: 18 }}>
        <input
          placeholder={filtros.tipo_documento === 'DUI' ? '12345678-9' : (filtros.tipo_documento === 'Pasaporte' ? 'N° de pasaporte' : 'N° de documento')}
          value={filtros.numero_documento}
          onChange={(e) => setFiltros({
            ...filtros,
            numero_documento: filtros.tipo_documento ? formatDocumento(filtros.tipo_documento, e.target.value) : e.target.value,
          })}
        />
        <select
          value={filtros.tipo_documento}
          onChange={(e) => setFiltros({ ...filtros, tipo_documento: e.target.value, numero_documento: '' })}
        >
          <option value="">Todos los documentos</option>
          <option value="DUI">Solo DUI</option>
          <option value="Pasaporte">Solo Pasaporte</option>
        </select>
        <div className="filtro-fecha">
          <label>Desde (ingreso)</label>
          <input type="date" value={filtros.desde}
            onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
        </div>
        <div className="filtro-fecha">
          <label>Hasta (ingreso)</label>
          <input type="date" value={filtros.hasta}
            onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        <button type="button" className="btn-ghost" onClick={limpiar}>Limpiar</button>
        <button type="button" className="btn-ghost" onClick={exportar} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar CSV
        </button>
        <button type="button" className="btn-ghost" onClick={exportarPdf} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Exportar PDF
        </button>
      </form>

      <div className="hist-resumen">
        <span>Transacciones: <strong>{historial.length}</strong></span>
        <span>Ventas: <strong>${totalVentas.toFixed(2)}</strong></span>
        <span>Puntos otorgados: <strong>{totalPuntos}</strong></span>
      </div>

      <div className="table-card">
        {cargando ? (
          <p className="table-empty">Cargando...</p>
        ) : historial.length === 0 ? (
          <p className="table-empty">No hay transacciones con esos filtros</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Huésped</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Hospedaje</th>
                <th>Folio</th>
                <th>Monto</th>
                <th>Descuento</th>
                <th>Puntos</th>
                <th>Registrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historial.map((t) => (
                <tr key={t.id_transaccion}>
                  <td>{t.nombres} {t.apellidos}</td>
                  <td><span className="badge-rol">{t.tipo_documento}</span> {t.numero_documento}</td>
                  <td>
                    {t.telefono || '—'}<br />
                    <small style={{ color: '#9ca3af' }}>{t.correo || ''}</small>
                  </td>
                  <td>
                    {t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—'}
                    {t.fecha_salida ? ` → ${new Date(t.fecha_salida).toLocaleDateString()}` : ''}
                  </td>
                  <td>{t.referencia_venta || '—'}</td>
                  <td>${Number(t.monto).toFixed(2)}</td>
                  <td>${Number(t.descuento_aplicado).toFixed(2)}</td>
                  <td>
                    <strong style={{ color: '#16a34a' }}>+{t.puntos_otorgados}</strong>
                    {t.puntos_canjeados > 0 && <span style={{ color: '#dc2626' }}> / -{t.puntos_canjeados}</span>}
                  </td>
                  <td><small>{new Date(t.fecha).toLocaleString()}</small></td>
                  <td>
                    <button
                      className="btn-icon-table"
                      title="Ver detalle"
                      onClick={() => setDetalleSeleccionado(t)}
                    >
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

      <ModalDetalle t={detalleSeleccionado} onClose={() => setDetalleSeleccionado(null)} />
    </div>
  );
}
