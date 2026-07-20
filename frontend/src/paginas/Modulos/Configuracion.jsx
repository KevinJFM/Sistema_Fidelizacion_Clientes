import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getConfiguracion, updateConfiguracion } from '../../servicios/servicioConfiguracion';
import {
  getTodasRecompensas,
  crearRecompensa,
  actualizarRecompensa,
  eliminarRecompensa,
} from '../../servicios/servicioRecompensas';
import Skeleton from '../../componentes/Skeleton/Skeleton';
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
  {
    titulo: 'Descuento por compra alta',
    descripcion: 'Descuento automático cuando la compra supera cierto monto',
    toggle: 'descuento_monto_activo',
    items: [
      { clave: 'descuento_monto_minimo', label: 'Monto mínimo de compra', sufijo: '$' },
      { clave: 'descuento_monto_valor',  label: 'Descuento otorgado',     sufijo: '$' },
    ],
  },
];

// Claves que son interruptores (se guardan como '1'/'0', no se validan como números)
const CLAVES_TOGGLE = GRUPOS.map((g) => g.toggle).filter(Boolean);

// Claves que existen en la BD pero no se muestran en esta pantalla
const CLAVES_OCULTAS = [
  'puntos_monto_base', 'puntos_por_monto', 'valor_canje', 'puntos_para_canje', 'canje_activo',
  'operador_puntos_persona', 'operador_min_personas', 'operador_valor_punto',
];

const FORM_VACIO = { nombre: '', tipo: 'Estándar', puntos: '' };

export default function Configuracion() {
  const [valores, setValores] = useState({});
  const [otros, setOtros]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Recompensas
  const [recompensas, setRecompensas]   = useState([]);
  const [loadingR, setLoadingR]         = useState(true);
  const [form, setForm]                 = useState(FORM_VACIO);
  const [editandoId, setEditandoId]     = useState(null);
  const [savingR, setSavingR]           = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await conMinimo(getConfiguracion());
      const mapa = {};
      data.forEach((c) => { mapa[c.clave] = c.valor; });
      setValores(mapa);

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

  const handleFormR = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  const iniciarEdicion = (r) => {
    setEditandoId(r.id);
    setForm({ nombre: r.nombre, tipo: r.tipo, puntos: r.puntos });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
  };

  const handleGuardarR = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.puntos || Number(form.puntos) <= 0) {
      toast.error('Nombre y puntos válidos son requeridos');
      return;
    }
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
      setSavingR(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este tipo de canje? No afectará el historial existente.')) return;
    try {
      await eliminarRecompensa(id);
      setRecompensas((prev) => prev.map((r) => r.id === id ? { ...r, activo: 0 } : r));
      toast.success('Tipo de canje eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleReactivar = async (r) => {
    try {
      const actualizado = await actualizarRecompensa(r.id, { nombre: r.nombre, tipo: r.tipo, puntos: r.puntos, activo: 1 });
      setRecompensas((prev) => prev.map((x) => x.id === r.id ? actualizado : x));
      toast.success('Tipo de canje reactivado');
    } catch {
      toast.error('Error al reactivar');
    }
  };

  const handleChange = (clave, valor) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleToggle = (clave) => {
    setValores((prev) => ({ ...prev, [clave]: prev[clave] === '1' ? '0' : '1' }));
  };

  const activo = (grupo) => !grupo.toggle || valores[grupo.toggle] === '1';

  const handleGuardar = async (e) => {
    e.preventDefault();
    // Validar solo los valores numéricos (no los interruptores)
    for (const [clave, valor] of Object.entries(valores)) {
      if (CLAVES_TOGGLE.includes(clave)) continue;
      if (valor === '' || Number(valor) < 0) {
        toast.error('Los valores no pueden estar vacíos ni ser negativos');
        return;
      }
    }
    setSaving(true);
    try {
      await updateConfiguracion(valores);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Configuración</h2>
      <p className="page-subtitle">Ajusta las reglas del programa de fidelización. Aplican a las nuevas transacciones.</p>

      {/* ===== Tipos de canje ===== */}
      <div className="config-card recompensas-card">
        <div className="config-head">
          <div>
            <h3>Tipos de canje</h3>
            <p>Define qué pueden obtener los clientes al canjear sus puntos</p>
          </div>
        </div>

        {/* Formulario crear / editar */}
        <form className="recompensa-form" onSubmit={handleGuardarR}>
          <div className="recompensa-form-fields">
            <div className="config-item">
              <label>Nombre</label>
              <div className="config-input">
                <input
                  type="text"
                  placeholder="Ej: Pasanoche fin de semana"
                  value={form.nombre}
                  onChange={(e) => handleFormR('nombre', e.target.value)}
                />
              </div>
            </div>
            <div className="config-item">
              <label>Categoría</label>
              <div className="config-input">
                <input
                  type="text"
                  placeholder="Ej: Estándar, Premium"
                  value={form.tipo}
                  onChange={(e) => handleFormR('tipo', e.target.value)}
                />
              </div>
            </div>
            <div className="config-item">
              <label>Puntos requeridos</label>
              <div className="config-input">
                <input
                  type="number"
                  min="1"
                  placeholder="Ej: 700"
                  value={form.puntos}
                  onChange={(e) => handleFormR('puntos', e.target.value)}
                />
                <span className="config-sufijo">pts</span>
              </div>
            </div>
          </div>
          <div className="recompensa-form-actions">
            <button type="submit" className="btn-primary btn-sm" disabled={savingR}>
              {savingR ? 'Guardando...' : editandoId ? 'Actualizar' : '+ Agregar'}
            </button>
            {editandoId && (
              <button type="button" className="btn-ghost btn-sm" onClick={cancelarEdicion}>
                Cancelar
              </button>
            )}
          </div>
        </form>

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
                  <span className="recompensa-nombre">{r.nombre}</span>
                  <span className="recompensa-meta">{r.tipo} · {r.puntos} pts · ${r.valor?.toFixed(2)}</span>
                </div>
                <div className="recompensa-acciones">
                  {r.activo ? (
                    <>
                      <button className="btn-icon" title="Editar" onClick={() => iniciarEdicion(r)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn-icon btn-icon-danger" title="Eliminar" onClick={() => handleEliminar(r.id)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </>
                  ) : (
                    <button className="btn-ghost btn-sm" onClick={() => handleReactivar(r)}>Reactivar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
        <form onSubmit={handleGuardar}>
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
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="config-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
