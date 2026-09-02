import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listarTransaccionesOperador } from '../../servicios/servicioOperadores';
import { exportarPDF } from '../../utilidades/pdf';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import { SkeletonFilas, SkeletonListado } from '../../componentes/Skeleton/Skeleton';
import Boton from '../../componentes/UI/Boton';
import Campo from '../../componentes/UI/Campo';
import DatePicker, { isoAFecha, fechaAISO } from '../../componentes/UI/DatePicker';
import Resumen from '../../componentes/UI/Resumen';
import ModalAnularOperador from '../../componentes/UI/ModalAnularOperador';
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
        <div style={{ background: '#EEF0FC', border: '1px solid #D6DBF5', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, color: '#0A1259', fontSize: 15 }}>{t.operador}</p>
          {t.telefono && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#374151', fontWeight: 700 }}>Tel: {t.telefono}</p>}
          {t.correo && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#374151', fontWeight: 700 }}>Correo: {t.correo}</p>}
        </div>

        {/* Aviso si el registro está anulado */}
        {t.anulada && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '10px 16px', marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#b91c1c', fontSize: 13 }}>Registro anulado</p>
            {t.motivo_anulacion && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151', fontWeight: 600 }}>Motivo: {t.motivo_anulacion}</p>}
            {t.anulada_por && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Anulada por: {t.anulada_por}</p>}
          </div>
        )}

        {/* Detalles */}
        {[
          { label: 'Registrado por', valor: t.registrado_por },
          { label: 'Fecha',          valor: new Date(t.fecha).toLocaleString() },
          { label: 'Personas',       valor: t.num_personas },
        ].map(({ label, valor }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e5e7eb', fontSize: 14 }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>{label}</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{valor}</span>
          </div>
        ))}

        {/* Puntos: otorgados (por visita) o canjeados */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {Number(t.puntos_canjeados) > 0 ? (
            <div style={{ flex: 1, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#dc2626' }}>-{Number(t.puntos_canjeados).toFixed(2)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#374151' }}>Puntos canjeados</p>
            </div>
          ) : (
            <div style={{ flex: 1, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#16a34a' }}>+{Number(t.puntos_otorgados).toFixed(2)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700, color: '#374151' }}>Puntos otorgados (por visita)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistorialOperadores() {
  const [searchParams] = useSearchParams();
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [inicial, setInicial]     = useState(true);
  const [filtros, setFiltros]     = useState({ tipo: '', desde: '', hasta: '' });
  const [detalle, setDetalle]     = useState(null);
  const [anulando, setAnulando]   = useState(null); // registro que se está anulando
  const [exito, setExito]         = useState('');
  const [page, setPage]           = useState(1);

  const cargar = async (f = {}) => {
    setCargando(true);
    try {
      setHistorial(await conMinimo(listarTransaccionesOperador(f)));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar el historial'));
    } finally {
      setCargando(false);
      setInicial(false);
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

  // Los registros anulados no cuentan en los totales.
  const totalPersonas = historial.reduce((s, t) => s + (t.anulada ? 0 : Number(t.num_personas)), 0);
  const totalPuntos   = historial.reduce((s, t) => s + (t.anulada ? 0 : Number(t.puntos_otorgados)), 0);
  const pageItems = historial.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [historial]); // a la página 1 cuando cambia el resultado

  const exportarPdf = () => {
    if (historial.length === 0) { toast.error('No hay datos para exportar'); return; }
    const head = ['Operador', 'Tipo', 'Correo', 'Personas', 'Puntos', 'Registrado por', 'Fecha'];
    const body = historial.map((t) => [
      t.anulada ? `${t.operador} (anulada)` : t.operador,
      t.tipo || '—',
      t.correo || '—',
      String(t.num_personas),
      Number(t.puntos_canjeados) > 0
        ? `-${Number(t.puntos_canjeados).toFixed(2)}`
        : `+${Number(t.puntos_otorgados).toFixed(2)}`,
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

  if (inicial) return <SkeletonListado columnas={8} conBoton={false} conBusqueda={false} filtros={2} />;

  return (
    <div className="admin-page">
      <h2 className="page-title">Historial de Tour Operadores</h2>
      <p className="page-subtitle">Grupos registrados y puntos otorgados por operador</p>

      <form className="filtros-row" onSubmit={aplicarFiltros} style={{ marginBottom: 18 }}>
        <Campo
          as="select"
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
        >
          <option value="">Todos los operadores</option>
          <option value="Persona natural">Persona natural</option>
          <option value="Empresa">Empresa</option>
        </Campo>
        <DatePicker size="compacto" label="Desde" placeholder="dd/mm/aaaa"
          value={isoAFecha(filtros.desde)}
          onChange={(d) => setFiltros({ ...filtros, desde: fechaAISO(d) })} />
        <DatePicker size="compacto" label="Hasta" placeholder="dd/mm/aaaa"
          value={isoAFecha(filtros.hasta)}
          onChange={(d) => setFiltros({ ...filtros, hasta: fechaAISO(d) })} />
        <button type="submit" className="btn-primary">Filtrar</button>
        <Boton type="button" onClick={limpiar}>Limpiar</Boton>
        <Boton type="button" onClick={exportarPdf} disabled={historial.length === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Exportar PDF
        </Boton>
      </form>

      <Resumen items={[
        { etiqueta: 'Registros', valor: historial.length },
        { etiqueta: 'Personas', valor: totalPersonas },
        { etiqueta: 'Puntos otorgados', valor: totalPuntos.toFixed(2) },
      ]} />

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
                <tr key={t.id_transaccion_op} className={t.anulada ? 'fila-anulada' : undefined}>
                  <td><strong>{t.operador}</strong></td>
                  <td>{t.tipo || '—'}</td>
                  <td>{t.correo || '—'}</td>
                  <td>{t.num_personas}</td>
                  <td>
                    {Number(t.puntos_canjeados) > 0
                      ? <strong style={{ color: '#dc2626' }}>-{Number(t.puntos_canjeados).toFixed(2)}</strong>
                      : <strong style={{ color: '#16a34a' }}>+{Number(t.puntos_otorgados).toFixed(2)}</strong>}
                  </td>
                  <td>{t.registrado_por}</td>
                  <td>
                    <small>{new Date(t.fecha).toLocaleString()}</small>
                    {t.anulada === 1 && <><br /><span className="badge-anulada">ANULADA</span></>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon-table" title="Ver detalle" onClick={() => setDetalle(t)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {!t.anulada && (
                        <button className="btn-icon-table btn-icon-danger" title="Anular registro" onClick={() => setAnulando(t)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </button>
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

      <ModalDetalleOperador t={detalle} onClose={() => setDetalle(null)} />

      {anulando && (
        <ModalAnularOperador
          transaccion={anulando}
          onCerrar={() => setAnulando(null)}
          onAnulada={() => {
            const id = anulando.id_transaccion_op;
            setAnulando(null);
            // Marca el registro como anulado en la lista (así sale de los totales y se oculta el botón).
            setHistorial((prev) => prev.map((x) =>
              x.id_transaccion_op === id ? { ...x, anulada: 1, anulada_en: new Date().toISOString() } : x
            ));
            setExito('Registro anulado');
          }}
        />
      )}

      {exito && <ModalExito mensaje={exito} onCerrar={() => setExito('')} />}
    </div>
  );
}
