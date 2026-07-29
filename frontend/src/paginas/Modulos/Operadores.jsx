import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getOperadores,
  createOperador,
  updateOperador,
  toggleEstadoOperador,
  registrarConsumoOperador,
  canjearOperador,
} from '../../servicios/servicioOperadores';
import { getRecompensas } from '../../servicios/servicioTransacciones';
import { formatTelefono, esCorreoValido } from '../../utilidades/formato';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import { SkeletonFilas, SkeletonListado } from '../../componentes/Skeleton/Skeleton';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

const ESTADO_INACTIVO = 2;
const emptyForm = { nombre: '', tipo: 'Persona natural', telefono: '', correo: '' };
const TIPOS_OPERADOR = ['Persona natural', 'Empresa'];
const emptyGrupo = { num_personas: '' };

export default function Operadores() {
  const navigate = useNavigate();
  const [operadores, setOperadores] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [inicial, setInicial]       = useState(true);
  const [filtro, setFiltro]         = useState('');
  const [page, setPage]             = useState(1);

  // Modal crear/editar
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [errores, setErrores]       = useState({});
  const [saving, setSaving]         = useState(false);

  // Modal registrar grupo
  const [grupoOp, setGrupoOp]       = useState(null); // operador seleccionado
  const [grupo, setGrupo]           = useState(emptyGrupo);
  const [resultado, setResultado]   = useState(null);
  const [registrando, setRegistrando] = useState(false);

  // Modal confirmar desactivar
  const [confirmOp, setConfirmOp]   = useState(null); // operador a desactivar
  const [desactivando, setDesactivando] = useState(false);

  // Modal confirmar activar
  const [activarOp, setActivarOp]   = useState(null); // operador a activar
  const [activando, setActivando]   = useState(false);

  // Modal canje de puntos
  const [canjeOp, setCanjeOp]       = useState(null); // operador seleccionado
  const [recompensas, setRecompensas] = useState([]);
  const [canjeSel, setCanjeSel]     = useState('');
  const [canjeando, setCanjeando]   = useState(false);
  const [resultadoCanje, setResultadoCanje] = useState(null);

  useEffect(() => { getRecompensas().then(setRecompensas).catch(() => {}); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      setOperadores(await conMinimo(getOperadores()));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar operadores'));
    } finally {
      setLoading(false);
      setInicial(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = operadores.filter((o) =>
    o.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    (o.correo || '').toLowerCase().includes(filtro.toLowerCase())
  );
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filtro]); // volver a la página 1 al buscar

  // ---------- Crear / editar ----------
  const abrirNuevo = () => { setEditingId(null); setForm(emptyForm); setErrores({}); setModalOpen(true); };
  const abrirEditar = (o) => {
    setEditingId(o.id_operador);
    setForm({ nombre: o.nombre, tipo: o.tipo || 'Persona natural', telefono: o.telefono || '', correo: o.correo || '' });
    setErrores({});
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = name === 'telefono' ? formatTelefono(value) : value;
    setForm((f) => ({ ...f, [name]: v }));
    if (errores[name]) setErrores((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'Requerido';
    if (form.correo && !esCorreoValido(form.correo)) errs.correo = 'Correo inválido';
    if (Object.keys(errs).length) { setErrores(errs); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateOperador(editingId, form);
        toast.success('Operador actualizado');
      } else {
        await createOperador(form);
        toast.success('Operador creado');
      }
      setModalOpen(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!confirmOp) return;
    setDesactivando(true);
    try {
      await toggleEstadoOperador(confirmOp.id_operador);
      toast.success('Operador desactivado');
      setConfirmOp(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desactivar');
    } finally {
      setDesactivando(false);
    }
  };

  const confirmarActivar = async () => {
    if (!activarOp) return;
    setActivando(true);
    try {
      await toggleEstadoOperador(activarOp.id_operador);
      toast.success('Operador activado');
      setActivarOp(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al activar');
    } finally {
      setActivando(false);
    }
  };

  // ---------- Registrar grupo ----------
  const abrirGrupo = (o) => { setGrupoOp(o); setGrupo(emptyGrupo); setResultado(null); };

  const handleRegistrarGrupo = async (e) => {
    e.preventDefault();
    const personas = Number(grupo.num_personas) || 0;
    if (personas <= 0) {
      toast.error('Ingresa la cantidad de personas');
      return;
    }
    setRegistrando(true);
    try {
      const r = await registrarConsumoOperador({
        id_operador: grupoOp.id_operador,
        num_personas: personas,
      });
      setResultado(r);
      if (r.otorga_puntos) toast.success('Consumo registrado');
      else toast('Registrado sin puntos (mínimo 12 personas)', { icon: '⚠️' });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally {
      setRegistrando(false);
    }
  };

  // ---------- Canje de puntos ----------
  const abrirCanje = (o) => { setCanjeOp(o); setCanjeSel(''); setResultadoCanje(null); };

  const handleCanjear = async (e) => {
    e.preventDefault();
    if (!canjeSel) { toast.error('Elige una recompensa'); return; }
    setCanjeando(true);
    try {
      const r = await canjearOperador({ id_operador: canjeOp.id_operador, id_recompensa: canjeSel });
      setResultadoCanje(r);
      toast.success('Canje registrado');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al canjear');
    } finally {
      setCanjeando(false);
    }
  };

  if (inicial) return <SkeletonListado columnas={7} />;

  return (
    <div className="admin-page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Tour Operadores</h2>
          <p className="page-subtitle">Empresas que traen grupos: gestión y registro de puntos</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>+ Nuevo operador</button>
      </div>

      <div className="table-card">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <input
              placeholder="Buscar por nombre o correo..."
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

        {!loading && filtrados.length === 0 ? (
          <p className="table-empty">No hay operadores registrados</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonFilas columnas={7} filas={8} />
              ) : pageItems.map((o) => (
                <tr key={o.id_operador}>
                  <td><strong>{o.nombre}</strong></td>
                  <td>{o.tipo || '—'}</td>
                  <td>{o.telefono || '—'}</td>
                  <td>{o.correo || '—'}</td>
                  <td><strong>{Number(o.puntos_acumulados).toFixed(2)}</strong></td>
                  <td><span className={`badge-estado estado-${o.estado?.toLowerCase()}`}>{o.estado}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn registrar" onClick={() => abrirGrupo(o)}
                        title={o.id_estado === ESTADO_INACTIVO ? 'Actívalo para registrar' : 'Registrar grupo'}
                        disabled={o.id_estado === ESTADO_INACTIVO}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                      <button className="icon-btn canje" onClick={() => abrirCanje(o)}
                        title={o.id_estado === ESTADO_INACTIVO ? 'Actívalo para canjear' : 'Canjear puntos'}
                        disabled={o.id_estado === ESTADO_INACTIVO}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                        </svg>
                      </button>
                      <button className="icon-btn historial" onClick={() => navigate(`/admin/operadores-historial?op=${o.id_operador}`)} title="Ver historial">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
                        </svg>
                      </button>
                      <button className="icon-btn edit" onClick={() => abrirEditar(o)} title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {o.id_estado === ESTADO_INACTIVO ? (
                        <button className="icon-btn activate" onClick={() => setActivarOp(o)} title="Activar operador">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                            <line x1="12" y1="2" x2="12" y2="12" />
                          </svg>
                        </button>
                      ) : (
                        <button className="icon-btn delete" onClick={() => setConfirmOp(o)} title="Desactivar operador">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

      <Paginacion total={filtrados.length} page={page} onChange={setPage} />

      {/* Modal crear/editar operador */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingId ? 'Editar operador' : 'Nuevo operador'}</h3>
            <form className="modal-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1.7fr' }}>
                <div className="form-field">
                  <label>Tipo</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange}>
                    {TIPOS_OPERADOR.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={`form-field ${errores.nombre ? 'has-error' : ''}`}>
                  <label>Nombre {errores.nombre && <span className="req-tag">{errores.nombre}</span>}</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1.7fr' }}>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="4322-2334" />
                </div>
                <div className={`form-field ${errores.correo ? 'has-error' : ''}`}>
                  <label>Correo {errores.correo && <span className="req-tag">{errores.correo}</span>}</label>
                  <input name="correo" value={form.correo} onChange={handleChange} placeholder="correo@empresa.com" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Guardar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal registrar grupo */}
      {grupoOp && (
        <div className="modal-overlay" onClick={() => setGrupoOp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Registrar grupo — {grupoOp.nombre}</h3>
            <form className="modal-form" onSubmit={handleRegistrarGrupo}>
              <div className="form-field">
                <label>Cantidad de personas</label>
                <input type="number" min="0" value={grupo.num_personas}
                  onChange={(e) => setGrupo({ ...grupo, num_personas: e.target.value })} />
                <small style={{ color: '#6b7280', fontWeight: 700 }}>Se otorgan puntos a partir de 12 personas.</small>
              </div>

              {resultado ? (
                resultado.otorga_puntos ? (
                  <div className="cliente-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
                      <span style={{ fontWeight: 700, color: '#063A34' }}>Puntos otorgados (por visita)</span>
                      <strong style={{ color: '#16a34a' }}>+{Number(resultado.puntos_otorgados).toFixed(2)}</strong>
                    </div>
                    <small style={{ color: '#6b7280' }}>Saldo del operador: {Number(resultado.saldo_puntos).toFixed(2)} pts</small>
                  </div>
                ) : (
                  <div className="cliente-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#b45309' }}>
                      Visita registrada sin puntos: se requieren mínimo {resultado.minimo_personas} personas.
                    </span>
                    <small style={{ color: '#6b7280' }}>Saldo del operador: {Number(resultado.saldo_puntos).toFixed(2)} pts</small>
                  </div>
                )
              ) : null}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setGrupoOp(null)}>
                  {resultado ? 'Cerrar' : 'Cancelar'}
                </button>
                {!resultado && (
                  <button type="submit" className="btn-primary" disabled={registrando}>
                    {registrando ? 'Registrando...' : 'Registrar y otorgar puntos'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal canje de puntos */}
      {canjeOp && (
        <div className="modal-overlay" onClick={() => setCanjeOp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Canjear puntos — {canjeOp.nombre}</h3>
            <form className="modal-form" onSubmit={handleCanjear}>
              <div className="cliente-card">
                <div>
                  <span className="cliente-nombre">{canjeOp.nombre}</span>
                  <span className="cliente-doc">{canjeOp.tipo}</span>
                </div>
                <div className="cliente-puntos">
                  <span>{Number(canjeOp.puntos_acumulados).toFixed(0)}</span>
                  <small>puntos</small>
                </div>
              </div>

              {!resultadoCanje && (
                <div className="form-field">
                  <label>Recompensa a canjear</label>
                  <select value={canjeSel} onChange={(e) => setCanjeSel(e.target.value)}>
                    <option value="">Elige una recompensa</option>
                    {recompensas.map((r) => {
                      const alcanza = Number(canjeOp.puntos_acumulados) >= r.puntos;
                      return (
                        <option key={r.id} value={r.id} disabled={!alcanza}>
                          {r.nombre} — {r.puntos} pts{alcanza ? '' : ' · faltan puntos'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {resultadoCanje && (
                <div className="cliente-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                    <span style={{ fontWeight: 700, color: '#063A34' }}>{resultadoCanje.recompensa}</span>
                    <strong style={{ color: '#dc2626' }}>-{Number(resultadoCanje.puntos_canjeados).toFixed(2)}</strong>
                  </div>
                  <small style={{ color: '#6b7280' }}>Saldo del operador: {Number(resultadoCanje.saldo_puntos).toFixed(2)} pts</small>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setCanjeOp(null)}>
                  {resultadoCanje ? 'Cerrar' : 'Cancelar'}
                </button>
                {!resultadoCanje && (
                  <button type="submit" className="btn-primary" disabled={canjeando}>
                    {canjeando ? 'Canjeando...' : 'Canjear'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar desactivar */}
      {confirmOp && (
        <div className="modal-overlay" onClick={() => setConfirmOp(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Desactivar operador?</h3>
            <p className="confirm-text">
              <strong>{confirmOp.nombre}</strong> pasará a estado inactivo.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmOp(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarDesactivar} disabled={desactivando}>
                {desactivando ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar activar */}
      {activarOp && (
        <div className="modal-overlay" onClick={() => setActivarOp(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon confirm-icon-ok">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Activar operador?</h3>
            <p className="confirm-text">
              <strong>{activarOp.nombre}</strong> volverá a estado activo.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setActivarOp(null)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={confirmarActivar} disabled={activando}>
                {activando ? 'Activando...' : 'Sí, activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
