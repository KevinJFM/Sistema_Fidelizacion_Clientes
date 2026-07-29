import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getPromociones,
  createPromocion,
  updatePromocion,
  togglePromocion,
  deletePromocion,
} from '../../servicios/servicioPromociones';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import DatePicker, { isoAFecha, fechaAISO } from '../../componentes/UI/DatePicker';
import { SkeletonFilas, SkeletonListado } from '../../componentes/Skeleton/Skeleton';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';

const formVacio = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  fecha_especial: '',
  puntos_extra: 0,
  descuento_extra: 0,
  max_usos_cliente: 1,
  activo: 1,
};

function formatFecha(fechaISO) {
  if (!fechaISO) return '—';
  return new Date(fechaISO).toLocaleDateString('es-SV');
}

function detectarTipo(promo) {
  return promo.fecha_especial ? 'unica' : 'rango';
}

export default function Promociones() {
  const [promociones, setPromociones]         = useState([]);
  const [cargando, setCargando]               = useState(true);
  const [inicial, setInicial]                 = useState(true);
  const [filtro, setFiltro]                   = useState('');
  const [page, setPage]                       = useState(1);
  const [modalAbierto, setModalAbierto]       = useState(false);
  const [editandoId, setEditandoId]           = useState(null);
  const [form, setForm]                       = useState(formVacio);
  const [tipoFecha, setTipoFecha]             = useState('unica');
  const [guardando, setGuardando]             = useState(false);
  const [erroresCampo, setErroresCampo]       = useState({});
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando, setEliminando]           = useState(false);
  const [confirmToggle, setConfirmToggle]     = useState(null);
  const [alternando, setAlternando]           = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setPromociones(await conMinimo(getPromociones()));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar promociones'));
    } finally {
      setCargando(false);
      setInicial(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(formVacio);
    setTipoFecha('unica');
    setErroresCampo({});
    setModalAbierto(true);
  };

  const abrirEditar = (p) => {
    setEditandoId(p.id_escenario);
    setTipoFecha(detectarTipo(p));
    setForm({
      nombre:           p.nombre,
      fecha_inicio:     p.fecha_inicio?.slice(0, 10)   ?? '',
      fecha_fin:        p.fecha_fin?.slice(0, 10)       ?? '',
      fecha_especial:   p.fecha_especial?.slice(0, 10)  ?? '',
      puntos_extra:     p.puntos_extra,
      descuento_extra:  Number(p.descuento_extra),
      max_usos_cliente: p.max_usos_cliente,
      activo:           p.activo,
    });
    setErroresCampo({});
    setModalAbierto(true);
  };

  const handleTipoFecha = (tipo) => {
    setTipoFecha(tipo);
    if (tipo === 'unica') {
      setForm((prev) => ({ ...prev, fecha_inicio: '', fecha_fin: '' }));
    } else {
      setForm((prev) => ({ ...prev, fecha_especial: '' }));
    }
    setErroresCampo({});
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let nuevoValor = value;
    if (type === 'number') nuevoValor = value === '' ? '' : Number(value);
    else if (name === 'activo') nuevoValor = Number(value); // el estado debe ser número (0/1)
    setForm((prev) => ({ ...prev, [name]: nuevoValor }));
    if (erroresCampo[name]) {
      setErroresCampo((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const validar = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'Requerido';

    if (tipoFecha === 'unica') {
      if (!form.fecha_especial) errs.fecha_especial = 'Ingrese una fecha';
    } else {
      if (!form.fecha_inicio || !form.fecha_fin) {
        errs.fecha_fin = 'Ingrese ambas fechas del rango';
      } else if (form.fecha_fin < form.fecha_inicio) {
        errs.fecha_fin = 'La fecha fin no puede ser menor que la fecha inicio';
      }
    }

    if (form.puntos_extra < 0) errs.puntos_extra = 'Debe ser 0 o mayor';
    if (form.descuento_extra < 0 || form.descuento_extra > 100) errs.descuento_extra = 'Debe ser entre 0 y 100';
    if (!form.max_usos_cliente || form.max_usos_cliente < 1) errs.max_usos_cliente = 'Mínimo 1';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length > 0) { setErroresCampo(errs); return; }

    setGuardando(true);
    try {
      if (editandoId) {
        await updatePromocion(editandoId, form);
        toast.success('Promoción actualizada');
      } else {
        await createPromocion(form);
        toast.success('Promoción creada');
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarToggle = async () => {
    if (!confirmToggle) return;
    setAlternando(true);
    try {
      const res = await togglePromocion(confirmToggle.id_escenario);
      toast.success(res.message);
      setConfirmToggle(null);
      await cargar();
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setAlternando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await deletePromocion(confirmEliminar.id_escenario);
      toast.success('Promoción eliminada');
      setConfirmEliminar(null);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const filtrados = promociones.filter((p) =>
    p.nombre.toLowerCase().includes(filtro.toLowerCase())
  );
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filtro]); // volver a la página 1 al buscar

  if (inicial) return <SkeletonListado columnas={8} />;

  return (
    <div className="admin-page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Promociones</h2>
          <p className="page-subtitle">Fechas especiales que aplican puntos extra y descuentos automáticamente</p>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva promoción
        </button>
      </div>

      <div className="table-card">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <input
              placeholder="Buscar por nombre..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
            />
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {!cargando && filtrados.length === 0 ? (
          <p className="table-empty">No hay promociones registradas</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha especial</th>
                <th>Rango de fechas</th>
                <th>Puntos extra</th>
                <th>Descuento</th>
                <th>Usos máx.</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <SkeletonFilas columnas={8} filas={8} />
              ) : pageItems.map((p) => {
                const estado = p.estado;
                return (
                  <tr key={p.id_escenario}>
                    <td><strong>{p.nombre}</strong></td>
                    <td>{formatFecha(p.fecha_especial)}</td>
                    <td>
                      {p.fecha_inicio
                        ? `${formatFecha(p.fecha_inicio)} → ${formatFecha(p.fecha_fin)}`
                        : '—'}
                    </td>
                    <td><strong style={{ color: '#16a34a' }}>+{p.puntos_extra}</strong></td>
                    <td>{Number(p.descuento_extra) > 0 ? `${Number(p.descuento_extra)}%` : '—'}</td>
                    <td>{p.max_usos_cliente}</td>
                    <td>
                      {estado === 'activo-hoy' && (
                        <span className="badge-estado estado-activo">Activo hoy</span>
                      )}
                      {estado === 'programada' && (
                        <span className="badge-estado estado-programada">Programada</span>
                      )}
                      {estado === 'finalizada' && (
                        <span className="badge-estado estado-finalizada">Finalizada</span>
                      )}
                      {estado === 'inactivo' && (
                        <span className="badge-estado estado-promo-inactivo">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className={`icon-btn ${p.activo ? 'warning' : 'activate'}`}
                          onClick={() => setConfirmToggle(p)}
                          title={p.activo ? 'Desactivar' : 'Activar'}
                        >
                          {p.activo ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                          )}
                        </button>
                        <button className="icon-btn edit" onClick={() => abrirEditar(p)} title="Editar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="icon-btn delete" onClick={() => setConfirmEliminar(p)} title="Eliminar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Paginacion total={filtrados.length} page={page} onChange={setPage} />

      {/* ── Modal crear / editar ── */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editandoId ? 'Editar promoción' : 'Nueva promoción'}</h3>

            <form className="modal-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
              <div className={`form-field ${erroresCampo.nombre ? 'has-error' : ''}`}>
                <label>
                  Nombre de la promoción
                  {erroresCampo.nombre && <span className="req-tag">{erroresCampo.nombre}</span>}
                </label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Día de la Madre" />
              </div>

              {/* Selector tipo de fecha */}
              <div className="form-field">
                <label>Tipo de fecha</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleTipoFecha('unica')}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid',
                      borderColor: tipoFecha === 'unica' ? 'transparent' : '#cbd5e1',
                      background: tipoFecha === 'unica' ? 'linear-gradient(135deg, #0A1259, #0D1BB8)' : '#fff',
                      color: tipoFecha === 'unica' ? '#ffffff' : '#374151',
                      fontWeight: tipoFecha === 'unica' ? 700 : 600,
                      fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Fecha única
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoFecha('rango')}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid',
                      borderColor: tipoFecha === 'rango' ? 'transparent' : '#cbd5e1',
                      background: tipoFecha === 'rango' ? 'linear-gradient(135deg, #0A1259, #0D1BB8)' : '#fff',
                      color: tipoFecha === 'rango' ? '#ffffff' : '#374151',
                      fontWeight: tipoFecha === 'rango' ? 700 : 600,
                      fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Rango de fechas
                  </button>
                </div>
              </div>
              </div>

              {tipoFecha === 'unica' ? (
                <div className={`form-field ${erroresCampo.fecha_especial ? 'has-error' : ''}`}>
                  <label>
                    Fecha especial
                    {erroresCampo.fecha_especial && <span className="req-tag">{erroresCampo.fecha_especial}</span>}
                  </label>
                  <DatePicker
                    size="compacto"
                    className="dp--bloque"
                    value={isoAFecha(form.fecha_especial)}
                    onChange={(d) => handleChange({ target: { name: 'fecha_especial', value: fechaAISO(d) } })}
                    placeholder="Elegir fecha"
                  />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-field">
                    <label>Fecha inicio</label>
                    <DatePicker
                      size="compacto"
                      className="dp--bloque"
                      value={isoAFecha(form.fecha_inicio)}
                      onChange={(d) => handleChange({ target: { name: 'fecha_inicio', value: fechaAISO(d) } })}
                      placeholder="Elegir fecha"
                    />
                  </div>
                  <div className={`form-field ${erroresCampo.fecha_fin ? 'has-error' : ''}`}>
                    <label>
                      Fecha fin
                      {erroresCampo.fecha_fin && <span className="req-tag">{erroresCampo.fecha_fin}</span>}
                    </label>
                    <DatePicker
                      size="compacto"
                      className="dp--bloque"
                      value={isoAFecha(form.fecha_fin)}
                      onChange={(d) => handleChange({ target: { name: 'fecha_fin', value: fechaAISO(d) } })}
                      placeholder="Elegir fecha"
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className={`form-field ${erroresCampo.puntos_extra ? 'has-error' : ''}`}>
                  <label>
                    Puntos extra
                    {erroresCampo.puntos_extra && <span className="req-tag">{erroresCampo.puntos_extra}</span>}
                  </label>
                  <input type="number" name="puntos_extra" value={form.puntos_extra} onChange={handleChange} min="0" />
                </div>
                <div className={`form-field ${erroresCampo.descuento_extra ? 'has-error' : ''}`}>
                  <label>
                    Descuento extra (%)
                    {erroresCampo.descuento_extra && <span className="req-tag">{erroresCampo.descuento_extra}</span>}
                  </label>
                  <input type="number" name="descuento_extra" value={form.descuento_extra} onChange={handleChange} min="0" max="100" step="1" />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${erroresCampo.max_usos_cliente ? 'has-error' : ''}`}>
                  <label>
                    Máx. usos por cliente
                    {erroresCampo.max_usos_cliente && <span className="req-tag">{erroresCampo.max_usos_cliente}</span>}
                  </label>
                  <input type="number" name="max_usos_cliente" value={form.max_usos_cliente} onChange={handleChange} min="1" />
                </div>
                <div className="form-field">
                  <label>Estado</label>
                  <select name="activo" value={form.activo} onChange={handleChange}>
                    <option value={1}>Activo</option>
                    <option value={0}>Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear promoción')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar activar / desactivar ── */}
      {confirmToggle && (
        <div className="modal-overlay" onClick={() => setConfirmToggle(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon" style={confirmToggle.activo ? undefined : { background: '#dcfce7', color: '#16a34a' }}>
              {confirmToggle.activo ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <h3 className="confirm-title">
              {confirmToggle.activo ? '¿Desactivar promoción?' : '¿Activar promoción?'}
            </h3>
            <p className="confirm-text">
              {confirmToggle.activo ? (
                <>
                  <strong>{confirmToggle.nombre}</strong> dejará de aplicar los puntos y descuentos
                  extra, aunque esté dentro de sus fechas configuradas.
                </>
              ) : (
                <>
                  <strong>{confirmToggle.nombre}</strong> volverá a aplicar automáticamente sus puntos
                  y descuentos extra en las fechas configuradas.
                </>
              )}
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmToggle(null)}>Cancelar</button>
              <button
                type="button"
                className={confirmToggle.activo ? 'btn-danger' : 'btn-primary'}
                onClick={confirmarToggle}
                disabled={alternando}
              >
                {alternando
                  ? 'Procesando...'
                  : (confirmToggle.activo ? 'Sí, desactivar' : 'Sí, activar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminar ── */}
      {confirmEliminar && (
        <div className="modal-overlay" onClick={() => setConfirmEliminar(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Eliminar promoción?</h3>
            <p className="confirm-text">
              <strong>{confirmEliminar.nombre}</strong> será eliminada permanentemente.
              Si tiene transacciones asociadas no se podrá eliminar.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarEliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
