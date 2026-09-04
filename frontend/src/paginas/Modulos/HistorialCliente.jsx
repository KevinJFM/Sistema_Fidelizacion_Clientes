import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { buscarCliente, buscarClientesPorNombre } from '../../servicios/servicioClientes';
import { listarTransacciones } from '../../servicios/servicioTransacciones';
import { getConfiguracion } from '../../servicios/servicioConfiguracion';
import { getPais, telefonoConCodigo } from '../../utilidades/paises';
import { exportarPDFCliente } from '../../utilidades/pdf';
import { formatDui } from '../../utilidades/formato';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import { SkeletonPerfil } from '../../componentes/Skeleton/Skeleton';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

const TIPOS = [
  { id: 1,    label: 'DUI' },
  { id: 2,    label: 'Pasaporte' },
  { id: 'nombre', label: 'Nombre' },
];

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
            <span style={{ background: '#EEF0FC', color: '#0A1259', fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>{t.nombre_promocion}</span>
          </div>
        )}

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

export default function HistorialCliente() {
  const [busqueda, setBusqueda]       = useState({ id_tipo_documento: 1, numero_documento: '' });
  const [cliente, setCliente]         = useState(null);
  const [historial, setHistorial]     = useState([]);
  const [buscando, setBuscando]       = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(false); // cargando el perfil de un cliente
  const [detalle, setDetalle]         = useState(null);
  const [page, setPage]               = useState(1);
  const [resultados, setResultados]   = useState([]); // lista al buscar por nombre
  const [cfgFrecuente, setCfgFrecuente] = useState(null); // regla de cliente frecuente (Configuración)

  const esBusquedaNombre = busqueda.id_tipo_documento === 'nombre';

  // Carga la regla de cliente frecuente una sola vez (para el badge del perfil).
  useEffect(() => {
    getConfiguracion()
      .then((data) => {
        const mapa = {};
        data.forEach((c) => { mapa[c.clave] = c.valor; });
        setCfgFrecuente({
          activo: mapa.frecuente_activo === '1',
          min:    Number(mapa.frecuente_min_transacciones) || 0,
          meses:  Number(mapa.frecuente_periodo_meses) || 0,
        });
      })
      .catch(() => {}); // si falla, el perfil funciona igual (sin badge)
  }, []);

  const cargarPerfil = async (idTipo, numDoc) => {
    setBuscando(true);
    setCargandoPerfil(true);
    setCliente(null);
    setHistorial([]);
    setResultados([]);
    try {
      const [c, h] = await conMinimo(Promise.all([
        buscarCliente(idTipo, numDoc),
        listarTransacciones({ numero_documento: numDoc }),
      ]));
      setCliente(c);
      setHistorial(h);
    } catch (err) {
      toast.error(mensajeError(err, 'Cliente no encontrado'));
    } finally {
      setBuscando(false);
      setCargandoPerfil(false);
    }
  };

  const handleBuscar = async () => {
    if (esBusquedaNombre) {
      if (!busqueda.numero_documento.trim()) { toast.error('Ingresa un nombre'); return; }
      setBuscando(true);
      setCliente(null);
      setHistorial([]);
      try {
        const lista = await conMinimo(buscarClientesPorNombre(busqueda.numero_documento.trim()));
        if (lista.length === 0) toast.error('No se encontraron clientes con ese nombre');
        else if (lista.length === 1) cargarPerfil(lista[0].id_tipo_documento, lista[0].numero_documento);
        else setResultados(lista);
      } catch (err) {
        toast.error(mensajeError(err, 'Error en la búsqueda'));
      } finally {
        setBuscando(false);
      }
      return;
    }
    if (!busqueda.numero_documento.trim()) { toast.error('Ingresa el número de documento'); return; }
    cargarPerfil(busqueda.id_tipo_documento, busqueda.numero_documento.trim());
  };

  // Las transacciones anuladas no suman en los totales (sus puntos fueron revertidos),
  // igual que en el Historial de transacciones.
  const activas         = historial.filter((t) => !t.anulada);
  const totalGastado    = activas.reduce((s, t) => s + Number(t.monto), 0);
  const totalDescuentos = activas.reduce((s, t) => s + Number(t.descuento_aplicado), 0);
  const totalPuntos     = activas.reduce((s, t) => s + t.puntos_otorgados, 0);
  const totalCanjeados  = activas.reduce((s, t) => s + t.puntos_canjeados, 0);
  const pageItems = historial.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [historial]); // a la página 1 al buscar otro cliente

  // Cliente frecuente: N transacciones (no anuladas) dentro de la ventana de meses configurada.
  let transEnVentana = 0;
  let esFrecuente = false;
  if (cfgFrecuente?.activo && cfgFrecuente.min > 0 && cfgFrecuente.meses > 0) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - cfgFrecuente.meses);
    transEnVentana = activas.filter((t) => new Date(t.fecha) >= desde).length;
    esFrecuente = transEnVentana >= cfgFrecuente.min;
  }

  const handleExportarPDF = () => {
    if (!cliente || historial.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    exportarPDFCliente({
      cliente,
      historial,
      totales: { totalGastado, totalDescuentos, totalPuntos, totalCanjeados, transacciones: activas.length },
    });
    toast.success('PDF generado');
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Perfil del cliente</h2>
      <p className="page-subtitle">Consulta el historial de puntos y transacciones de un huésped</p>

      {/* Buscador */}
      <div className="trans-card" style={{ maxWidth: 560, marginBottom: 24 }}>
        <div className="form-row busqueda-row">
          <div className="form-field">
            <label>Tipo de documento</label>
            <select
              value={busqueda.id_tipo_documento}
              onChange={(e) => { const v = e.target.value; setBusqueda({ id_tipo_documento: v === 'nombre' ? 'nombre' : Number(v), numero_documento: '' }); setResultados([]); setCliente(null); setHistorial([]); }}
            >
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>{esBusquedaNombre ? 'Nombre o apellido' : 'N° de documento'}</label>
            <div className="busqueda-input-row">
              <input
                value={busqueda.numero_documento}
                onChange={(e) => setBusqueda({
                  ...busqueda,
                  numero_documento: busqueda.id_tipo_documento === 1 ? formatDui(e.target.value) : e.target.value,
                })}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                placeholder={esBusquedaNombre ? 'Ej: García, Juan...' : busqueda.id_tipo_documento === 1 ? '12345678-9' : 'N° de pasaporte'}
              />
              <button type="button" className="btn-primary" onClick={handleBuscar} disabled={buscando}>
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de resultados al buscar por nombre */}
      {resultados.length > 1 && (
        <div className="table-card" style={{ maxWidth: 560, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            Se encontraron <strong>{resultados.length}</strong> clientes — selecciona uno:
          </p>
          {resultados.map((r) => (
            <button
              key={r.id_cliente}
              onClick={() => cargarPerfil(r.id_tipo_documento, r.numero_documento)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                background: 'none', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '10px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#EEF0FC'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0D1BB8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                {r.nombres.charAt(0)}{r.apellidos.charAt(0)}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#0A1259', fontSize: 14 }}>{r.nombres} {r.apellidos}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{r.tipo_documento}: {r.numero_documento} · {r.puntos_acumulados} pts</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Skeleton mientras carga el perfil del cliente */}
      {cargandoPerfil && !cliente && <SkeletonPerfil columnas={11} />}

      {/* Perfil del cliente */}
      {cliente && (
        <>
          <div className="perfil-cliente-card">
            <div className="perfil-avatar">
              {cliente.nombres.charAt(0)}{cliente.apellidos.charAt(0)}
            </div>
            <div className="perfil-info">
              <h3>{cliente.nombres} {cliente.apellidos}</h3>
              <p>
                <span className="badge-rol" style={{ marginRight: 6, background: '#0D1BB8', color: '#fff' }}>{cliente.tipo_documento}</span>
                <strong style={{ color: '#111827' }}>{cliente.numero_documento}</strong>
              </p>
              {esFrecuente && (
                <p style={{ margin: '8px 0 0' }}>
                  <span
                    title={`${transEnVentana} transacciones en los últimos ${cfgFrecuente.meses} meses`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d',
                      borderRadius: 20, padding: '4px 12px', fontSize: 12.5, fontWeight: 800,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                    </svg>
                    Cliente frecuente
                  </span>
                </p>
              )}
              {cliente.telefono && <p style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>Tel: {telefonoConCodigo(cliente.telefono, cliente.pais)}</p>}
              {cliente.pais && <p style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>País: {getPais(cliente.pais).bandera} {cliente.pais}</p>}
              {cliente.correo && <p style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>Correo: {cliente.correo}</p>}
            </div>
            <div className="perfil-stats">
              <div className="perfil-stat">
                <span className="perfil-stat-valor" style={{ color: '#0D1BB8' }}>{cliente.puntos_acumulados}</span>
                <span className="perfil-stat-label">Puntos actuales</span>
              </div>
              <div className="perfil-stat">
                <span className="perfil-stat-valor">{activas.length}</span>
                <span className="perfil-stat-label">Transacciones</span>
              </div>
              <div className="perfil-stat">
                <span className="perfil-stat-valor">${totalGastado.toFixed(2)}</span>
                <span className="perfil-stat-label">Total gastado</span>
              </div>
              <div className="perfil-stat">
                <span className="perfil-stat-valor" style={{ color: '#16a34a' }}>+{totalPuntos}</span>
                <span className="perfil-stat-label">Puntos ganados</span>
              </div>
            </div>
            <button className="btn-primary" onClick={handleExportarPDF} disabled={historial.length === 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Exportar PDF
            </button>
          </div>

          {/* Tabla de transacciones */}
          <div className="table-card" style={{ marginTop: 20 }}>
            {historial.length === 0 ? (
              <p className="table-empty">Este cliente no tiene transacciones registradas</p>
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
                  {pageItems.map((t) => (
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
        </>
      )}

      <ModalDetalle t={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
