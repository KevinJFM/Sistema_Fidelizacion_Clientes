import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransacciones } from '../../servicios/servicioTransacciones';
import { descargarExcel } from '../../utilidades/csv';
import { exportarPDF } from '../../utilidades/pdf';
import { formatDocumento } from '../../utilidades/formato';
import { telefonoConCodigo } from '../../utilidades/paises';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import { SkeletonFilas, SkeletonListado } from '../../componentes/Skeleton/Skeleton';
import Boton from '../../componentes/UI/Boton';
import Campo from '../../componentes/UI/Campo';
import DatePicker, { isoAFecha, fechaAISO } from '../../componentes/UI/DatePicker';
import Resumen from '../../componentes/UI/Resumen';
import ModalEditarTransaccion from '../../componentes/UI/ModalEditarTransaccion';
import ModalAnularTransaccion from '../../componentes/UI/ModalAnularTransaccion';
import ModalExito from '../../componentes/UI/ModalExito';
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

function ModalDetalle({ t, onClose }) {
  if (!t) return null;
  // Anulada: los montos y puntos se muestran en 0 (la transacción no otorgó nada).
  const anulada = !!t.anulada;
  const monto = anulada ? 0 : Number(t.monto);
  const descuento = anulada ? 0 : Number(t.descuento_aplicado);
  const otorgados = anulada ? 0 : t.puntos_otorgados;
  const canjeados = anulada ? 0 : t.puntos_canjeados;
  const totalPagado = monto - descuento;
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
        <div style={{ background: '#EEF0FC', border: '1px solid #D6DBF5', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#0A1259', fontSize: 15 }}>{t.nombres} {t.apellidos}</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#4b5563', display: 'flex', alignItems: 'center' }}>
            <span style={{ background: '#0D1BB8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginRight: 6 }}>{t.tipo_documento}</span>
            <strong style={{ color: '#111827', fontWeight: 700 }}>{t.numero_documento}</strong>
          </p>
        </div>

        {/* Aviso de anulación */}
        {t.anulada === 1 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#dc2626', fontSize: 14 }}>Transacción anulada</p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#7f1d1d' }}>
              {t.motivo_anulacion || 'Sin motivo registrado'}
              {t.anulada_por ? ` — ${t.anulada_por}` : ''}
              {t.anulada_en ? ` · ${new Date(t.anulada_en).toLocaleString()}` : ''}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7f1d1d' }}>
              Los puntos fueron revertidos y no cuenta en los totales.
            </p>
          </div>
        )}

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
            <span style={{ color: '#374151', fontWeight: 600 }}>{label}</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{valor}</span>
          </div>
        ))}

        {t.nombre_promocion && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e7eb', fontSize: 14 }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>Promoción</span>
            <span style={{ background: '#EEF0FC', color: '#0D1BB8', fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>{t.nombre_promocion}</span>
          </div>
        )}

        {/* Bloque financiero */}
        <div style={{ background: '#F5F6FE', border: '1.5px solid #D6DBF5', borderRadius: 14, padding: '14px 16px', margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: '#374151', fontWeight: 500 }}>Monto consumido</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>${monto.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
            <span style={{ color: '#374151', fontWeight: 500 }}>Descuento aplicado</span>
            <span style={{ fontWeight: 600, color: '#16a34a' }}>-${descuento.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
            <span style={{ fontWeight: 700, color: '#0A1259' }}>Total pagado</span>
            <span style={{ fontWeight: 800, color: '#0D1BB8', fontSize: 18 }}>${totalPagado.toFixed(2)}</span>
          </div>
        </div>

        {/* Puntos */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#16a34a' }}>+{otorgados}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#374151' }}>Puntos otorgados</p>
          </div>
          {canjeados > 0 && (
            <div style={{ flex: 1, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#dc2626' }}>-{canjeados}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#374151' }}>Puntos canjeados</p>
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
  const [inicial, setInicial]     = useState(true);
  const [filtros, setFiltros]     = useState({ numero_documento: '', tipo_documento: '', desde: '', hasta: '' });
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [editando, setEditando] = useState(null);   // transacción que se está editando (folio/fechas)
  const [anulando, setAnulando] = useState(null);   // transacción que se está anulando
  const [exito, setExito]       = useState('');      // mensaje del modal de éxito (check auto-cierre)
  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const ultimoFiltro = useRef({}); // último filtro aplicado (para el auto-refresco)

  const cargar = async (f = {}) => {
    ultimoFiltro.current = f;
    setCargando(true);
    try {
      setHistorial(await conMinimo(listarTransacciones(f)));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar el historial'));
    } finally {
      setCargando(false);
      setInicial(false);
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

  // Auto-refresco en segundo plano (transacciones del POS): usa el filtro activo, solo actualiza si cambió y se pausa si la pestaña no está visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      listarTransacciones(ultimoFiltro.current)
        .then((datos) => setHistorial((prev) => (JSON.stringify(prev) === JSON.stringify(datos) ? prev : datos)))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
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

  // Tras editar o anular: cierra el modal, recarga con el filtro activo y muestra el check de éxito.
  const trasEditar = () => { setEditando(null); cargar(ultimoFiltro.current); setExito('Cambios guardados'); };
  const trasAnular = () => { setAnulando(null); cargar(ultimoFiltro.current); setExito('Transacción anulada'); };

  const exportar = async () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const columnas = [
      { label: 'Huésped',          valor: (t) => `${t.nombres} ${t.apellidos}` },
      { label: 'Tipo documento',   valor: (t) => t.tipo_documento },
      { label: 'N° documento',     valor: (t) => t.numero_documento },
      { label: 'Teléfono',         valor: (t) => (t.telefono ? telefonoConCodigo(t.telefono, t.pais) : '') },
      { label: 'Correo',           valor: (t) => t.correo || '' },
      { label: 'Fecha ingreso',    valor: (t) => (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '') },
      { label: 'Fecha salida',     valor: (t) => (t.fecha_salida ? new Date(t.fecha_salida).toLocaleDateString() : '') },
      { label: 'Folio',            valor: (t) => t.referencia_venta || '' },
      { label: 'Promoción',        valor: (t) => t.nombre_promocion || '' },
      // Las anuladas se muestran en 0 (no otorgaron nada); el Estado y el Motivo las identifican.
      { label: 'Monto',            valor: (t) => (t.anulada ? 0 : Number(t.monto)), formato: '#,##0.00' },
      { label: 'Descuento',        valor: (t) => (t.anulada ? 0 : Number(t.descuento_aplicado)), formato: '#,##0.00' },
      { label: 'Puntos otorgados', valor: (t) => (t.anulada ? 0 : Number(t.puntos_otorgados)) },
      { label: 'Puntos canjeados', valor: (t) => (t.anulada ? 0 : Number(t.puntos_canjeados)) },
      { label: 'Cajero',           valor: (t) => t.cajero },
      { label: 'Registrado',       valor: (t) => new Date(t.fecha).toLocaleString() },
      { label: 'Estado',           valor: (t) => (t.anulada ? 'Anulada' : 'Activa') },
      { label: 'Motivo anulación', valor: (t) => t.motivo_anulacion || '' },
    ];
    const sufijo = filtros.numero_documento
      ? `_${filtros.numero_documento}`
      : (filtros.tipo_documento ? `_${filtros.tipo_documento.toLowerCase()}` : '_completo');

    // Fila de totales (sin contar anuladas), alineada a las columnas de arriba.
    const totalDescuentos = activas.reduce((s, t) => s + Number(t.descuento_aplicado), 0);
    const totalCanjeados  = activas.reduce((s, t) => s + t.puntos_canjeados, 0);
    const totales = columnas.map(() => '');
    totales[0]  = `Totales (sin anuladas): ${activas.length} transacciones`;
    totales[9]  = totalVentas;        // Monto
    totales[10] = totalDescuentos;    // Descuento
    totales[11] = totalPuntos;        // Puntos otorgados
    totales[12] = totalCanjeados;     // Puntos canjeados

    try {
      await descargarExcel(`historial${sufijo}_${new Date().toISOString().slice(0, 10)}.xlsx`, columnas, historial, {
        hoja: 'Historial',
        atenuar: (t) => !!t.anulada,
        totales,
      });
      toast.success('Historial exportado');
    } catch {
      toast.error('No se pudo generar el Excel');
    }
  };

  const exportarPdf = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const head = ['Huésped', 'Documento', 'Teléfono', 'Correo', 'Hospedaje', 'Promoción', 'Monto', 'Desc.', 'Puntos', 'Registrado'];
    const body = historial.map((t) => [
      `${t.nombres} ${t.apellidos}`,
      `${t.tipo_documento}: ${t.numero_documento}`,
      t.telefono ? telefonoConCodigo(t.telefono, t.pais) : '—',
      t.correo || '—',
      (t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—') +
        (t.fecha_salida ? ` a ${new Date(t.fecha_salida).toLocaleDateString()}` : ''),
      t.nombre_promocion || '—',
      // Anulada: en Monto va "(anulada)" en rojo; descuento y puntos en 0.
      t.anulada ? '(anulada)' : `$${Number(t.monto).toFixed(2)}`,
      `$${(t.anulada ? 0 : Number(t.descuento_aplicado)).toFixed(2)}`,
      t.anulada ? '+0' : `+${t.puntos_otorgados}${t.puntos_canjeados > 0 ? ` / -${t.puntos_canjeados}` : ''}`,
      new Date(t.fecha).toLocaleDateString() + '\n' + new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ]);
    const anuladas = historial.map((t) => !!t.anulada);

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

    const resumen = `Transacciones: ${activas.length}    Ingresos: $${totalVentas.toFixed(2)}    Puntos otorgados: ${totalPuntos}`;
    const sufijo = filtros.numero_documento
      ? `_${filtros.numero_documento}`
      : (filtros.tipo_documento ? `_${filtros.tipo_documento.toLowerCase()}` : '_completo');

    exportarPDF({ titulo, subtitulo: sub.join('     |     '), head, body, resumen, anuladas, colAnulada: 6,
      archivo: `historial${sufijo}_${new Date().toISOString().slice(0, 10)}.pdf` });
    toast.success('PDF generado');
  };

  // Las transacciones anuladas no suman en los totales (sus puntos fueron revertidos).
  const activas     = historial.filter((t) => !t.anulada);
  const totalVentas = activas.reduce((s, t) => s + Number(t.monto), 0);
  const totalPuntos = activas.reduce((s, t) => s + t.puntos_otorgados, 0);
  const pageItems = historial.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [historial]); // a la página 1 cuando cambia el resultado

  if (inicial) return <SkeletonListado columnas={10} conBoton={false} conBusqueda={false} filtros={4} />;

  return (
    <div className="admin-page">
      <h2 className="page-title">Historial de transacciones</h2>
      <p className="page-subtitle">Consulta de consumos y búsqueda de huéspedes por fecha de hospedaje</p>

      <form className="filtros-row" onSubmit={aplicarFiltros} style={{ marginBottom: 18 }}>
        <Campo
          placeholder={filtros.tipo_documento === 'DUI' ? '12345678-9' : (filtros.tipo_documento === 'Pasaporte' ? 'N° de pasaporte' : 'N° de documento')}
          value={filtros.numero_documento}
          onChange={(e) => setFiltros({
            ...filtros,
            numero_documento: filtros.tipo_documento ? formatDocumento(filtros.tipo_documento, e.target.value) : e.target.value,
          })}
        />
        <Campo
          as="select"
          value={filtros.tipo_documento}
          onChange={(e) => setFiltros({ ...filtros, tipo_documento: e.target.value, numero_documento: '' })}
        >
          <option value="">Todos los documentos</option>
          <option value="DUI">Solo DUI</option>
          <option value="Pasaporte">Solo Pasaporte</option>
        </Campo>
        <DatePicker size="compacto" label="Desde (ingreso)" placeholder="dd/mm/aaaa"
          value={isoAFecha(filtros.desde)}
          onChange={(d) => setFiltros({ ...filtros, desde: fechaAISO(d) })} />
        <DatePicker size="compacto" label="Hasta (ingreso)" placeholder="dd/mm/aaaa"
          value={isoAFecha(filtros.hasta)}
          onChange={(d) => setFiltros({ ...filtros, hasta: fechaAISO(d) })} />
        <button type="submit" className="btn-primary">Filtrar</button>
        <Boton type="button" onClick={limpiar}>Limpiar</Boton>
        <Boton type="button" onClick={exportar} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar Excel
        </Boton>
        <Boton type="button" onClick={exportarPdf} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Exportar PDF
        </Boton>
      </form>

      <Resumen items={[
        { etiqueta: 'Transacciones', valor: activas.length },
        { etiqueta: 'Ingresos', valor: `$${totalVentas.toFixed(2)}` },
        { etiqueta: 'Puntos otorgados', valor: totalPuntos },
      ]} />

      {/* Aviso solo si el backend recortó el resultado por el tope de seguridad (caso extremo). */}
      {historial.truncado && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e',
          borderRadius: 12, padding: '11px 15px', margin: '0 0 16px', fontSize: 13.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            Se alcanzó el máximo de {historial.limite?.toLocaleString()} transacciones. Estás viendo (y exportando)
            las más recientes. Filtra por fechas o documento para incluir las más antiguas.
          </span>
        </div>
      )}

      <div className="table-card">
        {!cargando && historial.length === 0 ? (
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
              {cargando ? (
                <SkeletonFilas columnas={10} filas={8} />
              ) : pageItems.map((t) => (
                <tr key={t.id_transaccion} className={t.anulada ? 'fila-anulada' : undefined}>
                  <td>{t.nombres} {t.apellidos}</td>
                  <td><span className="badge-rol badge-doc">{t.tipo_documento}</span> <strong>{t.numero_documento}</strong></td>
                  <td>
                    {t.telefono ? telefonoConCodigo(t.telefono, t.pais) : '—'}<br />
                    <small className="td-correo">{t.correo || ''}</small>
                  </td>
                  <td>
                    {t.fecha_ingreso ? new Date(t.fecha_ingreso).toLocaleDateString() : '—'}
                    {t.fecha_salida ? ` → ${new Date(t.fecha_salida).toLocaleDateString()}` : ''}
                  </td>
                  <td>{t.referencia_venta || '—'}</td>
                  <td>${(t.anulada ? 0 : Number(t.monto)).toFixed(2)}</td>
                  <td>${(t.anulada ? 0 : Number(t.descuento_aplicado)).toFixed(2)}</td>
                  <td>
                    <strong style={{ color: '#16a34a' }}>+{t.anulada ? 0 : t.puntos_otorgados}</strong>
                    {!t.anulada && t.puntos_canjeados > 0 && <span style={{ color: '#dc2626' }}> / -{t.puntos_canjeados}</span>}
                  </td>
                  <td>
                    <small>{new Date(t.fecha).toLocaleString()}</small>
                    {t.anulada === 1 && <><br /><span className="badge-anulada">ANULADA</span></>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
                      {t.anulada !== 1 && (
                        <>
                          <button
                            className="btn-icon-table btn-icon-edit"
                            title="Editar folio y fechas"
                            onClick={() => setEditando(t)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="btn-icon-table btn-icon-danger"
                            title="Anular transacción"
                            onClick={() => setAnulando(t)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Paginacion total={historial.length} page={page} onChange={setPage} />

      <ModalDetalle t={detalleSeleccionado} onClose={() => setDetalleSeleccionado(null)} />

      {editando && (
        <ModalEditarTransaccion
          transaccion={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={trasEditar}
        />
      )}

      {anulando && (
        <ModalAnularTransaccion
          transaccion={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={trasAnular}
        />
      )}

      {exito && <ModalExito mensaje={exito} onCerrar={() => setExito('')} />}
    </div>
  );
}
