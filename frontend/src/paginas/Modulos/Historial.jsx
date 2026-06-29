import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransacciones } from '../../servicios/servicioTransacciones';
import { descargarCSV } from '../../utilidades/csv';
import { exportarPDF } from '../../utilidades/pdf';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

export default function Historial() {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtros, setFiltros]     = useState({ numero_documento: '', desde: '', hasta: '' });
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

  // Al entrar: si viene ?doc= en la URL (desde "Ver historial" de un cliente), filtra por ese documento
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
    if (filtros.desde) f.desde = filtros.desde;
    if (filtros.hasta) f.hasta = filtros.hasta;
    cargar(f);
  };

  const limpiar = () => {
    setFiltros({ numero_documento: '', desde: '', hasta: '' });
    cargar();
  };

  const exportar = () => {
    if (historial.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const columnas = [
      { label: 'Huésped',          valor: (t) => `${t.nombres} ${t.apellidos}` },
      { label: 'Tipo documento',   valor: (t) => t.tipo_documento },
      { label: 'N° documento',     valor: (t) => t.numero_documento },
      { label: 'Teléfono',         valor: (t) => t.telefono || '' },
      { label: 'Correo',           valor: (t) => t.correo || '' },
      { label: 'Fecha ingreso',    valor: (t) => (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '') },
      { label: 'Fecha salida',     valor: (t) => (t.fecha_salida ? new Date(t.fecha_salida).toLocaleDateString() : '') },
      { label: 'Folio',            valor: (t) => t.referencia_venta || '' },
      { label: 'Monto',            valor: (t) => Number(t.monto).toFixed(2) },
      { label: 'Descuento',        valor: (t) => Number(t.descuento_aplicado).toFixed(2) },
      { label: 'Puntos otorgados', valor: (t) => t.puntos_otorgados },
      { label: 'Puntos canjeados', valor: (t) => t.puntos_canjeados },
      { label: 'Cajero',           valor: (t) => t.cajero },
      { label: 'Registrado',       valor: (t) => new Date(t.fecha).toLocaleString() },
    ];

    const sufijo = filtros.numero_documento ? `_${filtros.numero_documento}` : '_completo';
    const fecha  = new Date().toISOString().slice(0, 10);
    descargarCSV(`historial${sufijo}_${fecha}.csv`, columnas, historial);
    toast.success('Historial exportado');
  };

  const exportarPdf = () => {
    if (historial.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const head = ['Huésped', 'Documento', 'Teléfono', 'Hospedaje', 'Folio', 'Monto', 'Desc.', 'Puntos', 'Registrado'];
    const body = historial.map((t) => [
      `${t.nombres} ${t.apellidos}`,
      `${t.tipo_documento}: ${t.numero_documento}`,
      t.telefono || '—',
      (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—') +
        (t.fecha_salida ? ` -> ${new Date(t.fecha_salida).toLocaleDateString()}` : ''),
      t.referencia_venta || '—',
      `$${Number(t.monto).toFixed(2)}`,
      `$${Number(t.descuento_aplicado).toFixed(2)}`,
      `+${t.puntos_otorgados}${t.puntos_canjeados > 0 ? ` / -${t.puntos_canjeados}` : ''}`,
      new Date(t.fecha).toLocaleDateString(),
    ]);

    const individual = filtros.numero_documento && historial.length > 0;
    const titulo = individual
      ? `Historial de ${historial[0].nombres} ${historial[0].apellidos}`
      : 'Historial de transacciones';

    const sub = [`Generado: ${new Date().toLocaleString()}`];
    if (filtros.numero_documento) sub.push(`Documento: ${filtros.numero_documento}`);
    if (filtros.desde) sub.push(`Desde: ${filtros.desde}`);
    if (filtros.hasta) sub.push(`Hasta: ${filtros.hasta}`);

    const resumen = `Transacciones: ${historial.length}    Ventas: $${totalVentas.toFixed(2)}    Puntos otorgados: ${totalPuntos}`;
    const sufijo = filtros.numero_documento ? `_${filtros.numero_documento}` : '_completo';

    exportarPDF({
      titulo,
      subtitulo: sub.join('     |     '),
      head,
      body,
      resumen,
      archivo: `historial${sufijo}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
    toast.success('PDF generado');
  };

  // Totales del resultado actual
  const totalVentas = historial.reduce((s, t) => s + Number(t.monto), 0);
  const totalPuntos = historial.reduce((s, t) => s + t.puntos_otorgados, 0);

  return (
    <div className="admin-page">
      <h2 className="page-title">Historial de transacciones</h2>
      <p className="page-subtitle">Consulta de consumos y búsqueda de huéspedes por fecha de hospedaje</p>

      <form className="filtros-row" onSubmit={aplicarFiltros} style={{ marginBottom: 18 }}>
        <input
          placeholder="N° de documento"
          value={filtros.numero_documento}
          onChange={(e) => setFiltros({ ...filtros, numero_documento: e.target.value })}
        />
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar CSV
        </button>
        <button type="button" className="btn-ghost" onClick={exportarPdf} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: '-2px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Exportar PDF
        </button>
      </form>

      {/* Resumen de los resultados */}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
