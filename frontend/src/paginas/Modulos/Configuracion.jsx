import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { getConfiguracion, updateConfiguracion } from '../../servicios/servicioConfiguracion';
import {
  getTodasRecompensas,
  crearRecompensa,
  actualizarRecompensa,
  eliminarRecompensa,
} from '../../servicios/servicioRecompensas';
import Skeleton, { SkeletonConfig } from '../../componentes/Skeleton/Skeleton';
import ModalExito from '../../componentes/UI/ModalExito';
import PlantillasCorreo from './PlantillasCorreo';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Configuracion.css';

// Metadatos de cada regla. `toggle` es la clave del interruptor ON/OFF (si aplica).
const GRUPOS = [
  {
    titulo: 'Bienvenida (primera compra)',
    descripcion: 'Beneficio que recibe el cliente en su primera transacción',
    toggle: 'bienvenida_activo',
    items: [
      { clave: 'bienvenida_puntos',    label: 'Puntos extra de bienvenida', sufijo: 'pts' },
      { clave: 'bienvenida_descuento', label: 'Descuento de bienvenida',    sufijo: '$'   },
    ],
  },
];

// Claves que son interruptores (se guardan como '1'/'0', no se validan como números)
const CLAVES_TOGGLE = GRUPOS.map((g) => g.toggle).filter(Boolean);

// Claves que existen en la BD pero no se muestran en esta pantalla
const CLAVES_OCULTAS = [
  'puntos_monto_base', 'puntos_por_monto', 'valor_canje', 'puntos_para_canje', 'canje_activo',
  'operador_puntos_persona', 'operador_min_personas', 'operador_valor_punto',
  // Descuento por compra alta: función retirada. Se ocultan por si quedan filas en BD antiguas.
  'descuento_monto_minimo', 'descuento_monto_valor', 'descuento_monto_activo',
];

const FORM_VACIO = { nombre: '', tipo: 'Estándar', puntos: '' };

export default function Configuracion() {
  const [valores, setValores] = useState({});
  const [otros, setOtros]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [exito, setExito]     = useState('');

  // Recompensas
  const [recompensas, setRecompensas]   = useState([]);
  const [loadingR, setLoadingR]         = useState(true);
  const [form, setForm]                 = useState(FORM_VACIO);
  const [editandoId, setEditandoId]     = useState(null);
  const [savingR, setSavingR]           = useState(false);
  const [modalR, setModalR]             = useState(false);
  const [confirmEliminarR, setConfirmEliminarR] = useState(null);
  const [eliminandoR, setEliminandoR]           = useState(false);
  const [confirmToggleR, setConfirmToggleR]     = useState(null);
  const [cambiandoEstadoR, setCambiandoEstadoR] = useState(false);
  const enviandoR = useRef(false);

  // Espejo de los valores ya guardados en BD (para autoguardar solo lo que cambió).
  const valoresGuardados = useRef({});

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await conMinimo(getConfiguracion());
      const mapa = {};
      data.forEach((c) => { mapa[c.clave] = c.valor; });
      setValores(mapa);
      valoresGuardados.current = mapa;

      // Claves que no están en ningún grupo (por si se agregan nuevas)
      const conocidas = [
        ...GRUPOS.flatMap((g) => g.items.map((i) => i.clave)),
        ...CLAVES_TOGGLE,
        ...CLAVES_OCULTAS,
      ];
      setOtros(data.filter((c) => !conocidas.includes(c.clave)));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar la configuración'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const cargarRecompensas = async () => {
    setLoadingR(true);
    try {
      const data = await getTodasRecompensas();
      setRecompensas(data);
    } catch {
      toast.error('Error al cargar tipos de canje');
    } finally {
      setLoadingR(false);
    }
  };

  useEffect(() => { cargarRecompensas(); }, []);

  // Primera carga: TODA la pantalla como esqueleto hasta que carguen ambas secciones.
  const [inicial, setInicial] = useState(true);
  useEffect(() => { if (!loading && !loadingR) setInicial(false); }, [loading, loadingR]);

  const handleFormR = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const abrirCrear = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setModalR(true);
  };

  const iniciarEdicion = (r) => {
    setEditandoId(r.id);
    setForm({ nombre: r.nombre, tipo: r.tipo, puntos: r.puntos });
    setModalR(true);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setModalR(false);
  };

  const handleGuardarR = async (e) => {
    e.preventDefault();
    if (enviandoR.current) return;
    if (!form.nombre.trim() || !form.puntos || Number(form.puntos) <= 0) {
      toast.error('Nombre y puntos válidos son requeridos');
      return;
    }
    enviandoR.current = true;
    setSavingR(true);
    try {
      if (editandoId) {
        const actualizado = await actualizarRecompensa(editandoId, { ...form, puntos: Number(form.puntos), activo: 1 });
        setRecompensas((prev) => prev.map((r) => r.id === editandoId ? actualizado : r));
        toast.success('Tipo de canje actualizado');
      } else {
        const nuevo = await crearRecompensa({ ...form, puntos: Number(form.puntos) });
        setRecompensas((prev) => [...prev, nuevo]);
        toast.success('Tipo de canje creado');
      }
      cancelarEdicion();
    } catch {
      toast.error('Error al guardar el tipo de canje');
    } finally {
      enviandoR.current = false;
      setSavingR(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!confirmEliminarR) return;
    setEliminandoR(true);
    try {
      await eliminarRecompensa(confirmEliminarR.id);
      setRecompensas((prev) => prev.filter((r) => r.id !== confirmEliminarR.id));
      toast.success('Tipo de canje eliminado');
      setConfirmEliminarR(null);
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setEliminandoR(false);
    }
  };

  const confirmarToggleActivo = async () => {
    if (!confirmToggleR) return;
    const r = confirmToggleR;
    const nuevoEstado = r.activo ? 0 : 1;
    setCambiandoEstadoR(true);
    try {
      const actualizado = await actualizarRecompensa(r.id, { nombre: r.nombre, tipo: r.tipo, puntos: r.puntos, activo: nuevoEstado });
      setRecompensas((prev) => prev.map((x) => x.id === r.id ? actualizado : x));
      toast.success(nuevoEstado ? 'Tipo de canje reactivado' : 'Tipo de canje desactivado');
      setConfirmToggleR(null);
    } catch {
      toast.error('Error al cambiar el estado');
    } finally {
      setCambiandoEstadoR(false);
    }
  };

  const handleChange = (clave, valor) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleToggle = async (clave) => {
    const anterior = valores[clave];
    const nuevoValor = anterior === '1' ? '0' : '1';
    setValores((prev) => ({ ...prev, [clave]: nuevoValor }));
    try {
      await updateConfiguracion({ [clave]: nuevoValor });
      valoresGuardados.current = { ...valoresGuardados.current, [clave]: nuevoValor };
      toast.success(nuevoValor === '1' ? 'Opción activada' : 'Opción desactivada');
    } catch {
      setValores((prev) => ({ ...prev, [clave]: anterior }));
      toast.error('Error al guardar el cambio');
    }
  };

  const activo = (grupo) => !grupo.toggle || valores[grupo.toggle] === '1';

  // Autoguardado por campo: guarda al salir del campo, solo si cambió.
  const guardarCampo = async (clave, { numerico = true } = {}) => {
    const valor = valores[clave] ?? '';
    if (valor === (valoresGuardados.current[clave] ?? '')) return; // sin cambios
    if (numerico && (valor === '' || Number(valor) < 0)) {
      toast.error('El valor no puede estar vacío ni ser negativo');
      setValores((prev) => ({ ...prev, [clave]: valoresGuardados.current[clave] ?? '' }));
      return;
    }
    try {
      await updateConfiguracion({ [clave]: valor });
      valoresGuardados.current = { ...valoresGuardados.current, [clave]: valor };
      toast.success('Cambio guardado');
    } catch (err) {
      setValores((prev) => ({ ...prev, [clave]: valoresGuardados.current[clave] ?? '' }));
      toast.error(err.response?.data?.message || 'Error al guardar el cambio');
    }
  };

  // Guarda con botón los valores (numéricos) de un grupo y confirma con el check de éxito.
  const guardarGrupo = async (grupo) => {
    for (const item of grupo.items) {
      const valor = valores[item.clave] ?? '';
      if (valor === '' || Number(valor) < 0) {
        toast.error('Los valores no pueden estar vacíos ni ser negativos');
        return;
      }
    }
    setSavingGrupo(true);
    try {
      const cambios = {};
      grupo.items.forEach((item) => { cambios[item.clave] = valores[item.clave]; });
      await updateConfiguracion(cambios);
      valoresGuardados.current = { ...valoresGuardados.current, ...cambios };
      setExito('Cambios guardados');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSavingGrupo(false);
    }
  };

  if (inicial) return <SkeletonConfig tarjetas={3} filasPorTarjeta={3} />;

  return (
    <div className="admin-page">
      <h2 className="page-title">Configuración</h2>
      <p className="page-subtitle">Ajusta las reglas del programa de fidelización. Aplican a las nuevas transacciones.</p>

      {/* ===== Bienvenida (primera compra) y otras reglas ===== */}
      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div className="config-card" key={i}>
            <div className="config-head"><div><Skeleton width={200} height={16} /></div></div>
            <div className="config-grid">
              <Skeleton height={46} radius={12} />
              <Skeleton height={46} radius={12} />
            </div>
          </div>
        ))
      ) : (
        <>
          {GRUPOS.map((grupo) => {
            const habilitado = activo(grupo);
            return (
              <div className={`config-card ${grupo.toggle && !habilitado ? 'config-card-off' : ''}`} key={grupo.titulo}>
                <div className="config-head">
                  <div>
                    <h3>{grupo.titulo}</h3>
                    {grupo.descripcion && <p>{grupo.descripcion}</p>}
                  </div>
                  {grupo.toggle && (
                    <button
                      type="button"
                      className={`switch ${habilitado ? 'switch-on' : ''}`}
                      onClick={() => handleToggle(grupo.toggle)}
                      aria-pressed={habilitado}
                      title={habilitado ? 'Regla activa' : 'Regla desactivada'}
                    >
                      <span className="switch-knob" />
                      <span className="switch-label">{habilitado ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  )}
                </div>
                <div className="config-grid">
                  {grupo.items.map((item) => (
                    <div className="config-item" key={item.clave}>
                      <label>{item.label}</label>
                      <div className="config-input">
                        {item.sufijo === '$' && <span className="config-sufijo">$</span>}
                        <input
                          type="number"
                          min="0"
                          step={item.sufijo === '$' ? '0.01' : '1'}
                          value={valores[item.clave] ?? ''}
                          disabled={!habilitado}
                          onChange={(e) => handleChange(item.clave, e.target.value)}
                        />
                        {item.sufijo === 'pts' && <span className="config-sufijo">pts</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="config-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!habilitado || savingGrupo}
                    onClick={() => guardarGrupo(grupo)}
                  >
                    {savingGrupo ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Otras claves que no están agrupadas */}
          {otros.length > 0 && (
            <div className="config-card">
              <div className="config-head"><div><h3>Tour Operadores</h3></div></div>
              <div className="config-grid">
                {otros.map((c) => (
                  <div className="config-item" key={c.clave}>
                    <label>{c.descripcion || c.clave}</label>
                    <div className="config-input">
                      <input
                        type="text"
                        value={valores[c.clave] ?? ''}
                        onChange={(e) => handleChange(c.clave, e.target.value)}
                        onBlur={() => guardarCampo(c.clave, { numerico: false })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== Tipos de canje ===== */}
      <div className="config-card recompensas-card">
        <div className="config-head">
          <div>
            <h3>Tipos de canje</h3>
            <p>Define qué pueden obtener los clientes al canjear sus puntos</p>
          </div>
          <button type="button" className="btn-primary" onClick={abrirCrear}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo canje
          </button>
        </div>

        {/* Lista de tipos de canje */}
        {loadingR ? (
          <div className="recompensas-list">
            {[1, 2, 3].map((i) => <Skeleton key={i} height={52} radius={12} />)}
          </div>
        ) : (
          <div className="recompensas-list">
            {recompensas.length === 0 && (
              <p className="recompensas-empty">No hay tipos de canje. Agrega uno arriba.</p>
            )}
            {recompensas.map((r) => (
              <div key={r.id} className={`recompensa-item ${r.activo ? '' : 'recompensa-inactiva'}`}>
                <div className="recompensa-info">
                  <div className="recompensa-nombre-row">
                    <span className="recompensa-nombre">{r.nombre}</span>
                  </div>
                  <span className="recompensa-meta">{r.tipo} · {r.puntos} pts · ${r.valor?.toFixed(2)}</span>
                </div>
                <div className="recompensa-acciones">
                  {!r.activo && <span className="badge-inactivo">Inactivo</span>}
                  <button className="icon-btn edit" title="Editar" onClick={() => iniciarEdicion(r)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    className={`icon-btn ${r.activo ? 'activate' : 'warning'}`}
                    title={r.activo ? 'Desactivar' : 'Reactivar'}
                    onClick={() => setConfirmToggleR(r)}
                  >
                    {r.activo ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    )}
                  </button>
                  <button className="icon-btn delete" title="Eliminar" onClick={() => setConfirmEliminarR(r)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Correos al cliente (plantillas configurables) ===== */}
      <PlantillasCorreo />

      {/* ── Modal crear / editar tipo de canje ── */}
      {modalR && (
        <div className="modal-overlay" onClick={cancelarEdicion}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editandoId ? 'Editar canje' : 'Nuevo canje'}</h3>

            <form className="modal-form" onSubmit={handleGuardarR} noValidate>
              <div className="form-field">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Pasanoche fin de semana"
                  value={form.nombre}
                  onChange={(e) => handleFormR('nombre', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej: Estándar, Premium"
                    value={form.tipo}
                    onChange={(e) => handleFormR('tipo', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Puntos requeridos</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 700"
                    value={form.puntos}
                    onChange={(e) => handleFormR('puntos', e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={cancelarEdicion}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={savingR}>
                  {savingR ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear canje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal activar / desactivar tipo de canje ── */}
      {confirmToggleR && (
        <div className="modal-overlay" onClick={() => setConfirmToggleR(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon ${confirmToggleR.activo ? 'confirm-icon-warn' : 'confirm-icon-ok'}`}>
              {confirmToggleR.activo ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </div>
            <h3 className="confirm-title">
              {confirmToggleR.activo ? '¿Desactivar tipo de canje?' : '¿Reactivar tipo de canje?'}
            </h3>
            <p className="confirm-text">
              <strong>{confirmToggleR.nombre}</strong>{' '}
              {confirmToggleR.activo
                ? 'quedará oculto para los clientes. Seguirá guardado y podrás reactivarlo cuando quieras.'
                : 'volverá a estar disponible para los clientes.'}
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmToggleR(null)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={confirmarToggleActivo} disabled={cambiandoEstadoR}>
                {cambiandoEstadoR
                  ? 'Guardando...'
                  : confirmToggleR.activo ? 'Sí, desactivar' : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar tipo de canje ── */}
      {confirmEliminarR && (
        <div className="modal-overlay" onClick={() => setConfirmEliminarR(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Eliminar tipo de canje?</h3>
            <p className="confirm-text">
              <strong>{confirmEliminarR.nombre}</strong> será eliminado permanentemente.
              Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmEliminarR(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarEliminar} disabled={eliminandoR}>
                {eliminandoR ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de guardado (check con autocierre) */}
      {exito && <ModalExito mensaje={exito} onCerrar={() => setExito('')} />}
    </div>
  );
}
