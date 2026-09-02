import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getClientes,
  createCliente,
  updateCliente,
  reenviarCodigo,
} from '../../servicios/servicioClientes';
import { getDepartamentos, getDistritos } from '../../servicios/servicioUbicaciones';
import { formatDui, formatTelefonoPais, esDuiValido, esTelefonoPaisValido, esCorreoValido } from '../../utilidades/formato';
import { PAISES, getPais, telefonoConCodigo } from '../../utilidades/paises';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
import DatePicker, { isoAFecha, fechaAISO } from '../../componentes/UI/DatePicker';
import ModalExito from '../../componentes/UI/ModalExito';
import { SkeletonFilas, SkeletonListado } from '../../componentes/Skeleton/Skeleton';
import { conMinimo, mensajeError } from '../../utilidades/carga';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';

const TIPO_DUI = 1;

const TIPOS_DOCUMENTO = [
  { id: 1, label: 'DUI' },
  { id: 2, label: 'Pasaporte' },
];
const ESTADO_INACTIVO = 2;
const ESTADOS_FORM = [
  { id: 1, label: 'Activo' },
  { id: 3, label: 'Suspendido' },
];

const emptyForm = {
  id_tipo_documento: 1,
  numero_documento: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  pais: 'El Salvador',
  correo: '',
  fecha_nacimiento: '',
  id_departamento: null,
  id_distrito: null,
  id_estado: 1,
};

// Estrella de "cliente frecuente". `activa` la pinta dorada rellena; si no, contorno gris.
function EstrellaFrecuente({ activa = true, size = 15 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={activa ? '#f59e0b' : 'none'}
      stroke={activa ? '#f59e0b' : '#9ca3af'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [inicial, setInicial]   = useState(true); // solo la PRIMERA carga muestra el skeleton de módulo completo
  const [filtro, setFiltro]     = useState('');
  const [soloFrecuentes, setSoloFrecuentes] = useState(false); // filtro: mostrar solo clientes frecuentes
  const [page, setPage]         = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [exito, setExito]         = useState(null); // mensaje del check de éxito que se cierra solo
  const [fieldErrors, setFieldErrors] = useState({});
  const [departamentos, setDepartamentos] = useState([]);
  const [distritos, setDistritos]         = useState([]);
  const [reenviandoId, setReenviandoId]   = useState(null); // cliente al que se le está reenviando el código

  const navigate = useNavigate();

  // Reenvía el código de acceso (OTP) al correo del cliente.
  const reenviar = async (c) => {
    if (!c.correo) { toast.error('El cliente no tiene correo registrado'); return; }
    setReenviandoId(c.id_cliente);
    try {
      const { message } = await reenviarCodigo(c.id_cliente);
      toast.success(message || 'Código enviado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar el código');
    } finally {
      setReenviandoId(null);
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      setClientes(await conMinimo(getClientes()));
    } catch (err) {
      toast.error(mensajeError(err, 'Error al cargar clientes'));
    } finally {
      setLoading(false);
      setInicial(false);
    }
  };

  useEffect(() => {
    cargar();
    getDepartamentos().then(setDepartamentos).catch(() => {});
  }, []);

  // Auto-refresco en segundo plano (POS u otro cajero): solo actualiza si los datos cambiaron y se pausa si la pestaña no está visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      getClientes()
        .then((datos) => setClientes((prev) => (JSON.stringify(prev) === JSON.stringify(datos) ? prev : datos)))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const abrirCrear = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDistritos([]);
    setFieldErrors({});
    setModalOpen(true);
  };

  const abrirEditar = async (c) => {
    setEditingId(c.id_cliente);
    setForm({
      id_tipo_documento: c.id_tipo_documento,
      numero_documento: c.numero_documento,
      nombres: c.nombres,
      apellidos: c.apellidos,
      telefono: c.telefono ?? '',
      pais: c.pais ?? 'El Salvador',
      correo: c.correo ?? '',
      fecha_nacimiento: c.fecha_nacimiento?.slice(0, 10) ?? '',
      id_departamento: c.id_departamento ?? null,
      id_distrito: c.id_distrito ?? null,
      id_estado: c.id_estado,
    });
    setFieldErrors({});
    // Cargar los distritos del departamento del cliente (para el select)
    if (c.id_departamento) {
      try { setDistritos(await getDistritos(c.id_departamento)); } catch { setDistritos([]); }
    } else {
      setDistritos([]);
    }
    setModalOpen(true);
  };

  const onDepartamentoChange = async (e) => {
    const valor = e.target.value ? Number(e.target.value) : null;
    setForm((f) => ({ ...f, id_departamento: valor, id_distrito: null }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.id_departamento;
      delete next.id_distrito;
      return next;
    });
    if (valor) {
      try { setDistritos(await getDistritos(valor)); } catch { setDistritos([]); }
    } else {
      setDistritos([]);
    }
  };

  const onDistritoChange = (e) => {
    setForm((f) => ({ ...f, id_distrito: e.target.value ? Number(e.target.value) : null }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.id_distrito;
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev };
      if (name === 'id_tipo_documento') {
        const tipo = Number(value);
        next.id_tipo_documento = tipo;
        // El DUI implica cliente salvadoreño: fija el país y re-formatea el teléfono como local.
        if (tipo === TIPO_DUI) {
          next.pais = 'El Salvador';
          next.telefono = formatTelefonoPais('El Salvador', prev.telefono);
        }
      } else if (name === 'pais') {
        next.pais = value;
        next.telefono = formatTelefonoPais(value, prev.telefono); // re-formatea según el nuevo país
      } else if (name === 'telefono') {
        next.telefono = formatTelefonoPais(prev.pais, value);
      } else if (name === 'numero_documento' && prev.id_tipo_documento === TIPO_DUI) {
        next.numero_documento = formatDui(value);
      } else if (name.startsWith('id_')) {
        next[name] = Number(value);
      } else {
        next[name] = value;
      }
      return next;
    });
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errores = {};
    ['numero_documento', 'nombres', 'apellidos'].forEach((campo) => {
      if (!String(form[campo]).trim()) errores[campo] = 'Requerido';
    });
    // Formato de DUI (solo cuando el tipo es DUI)
    if (form.id_tipo_documento === TIPO_DUI && form.numero_documento && !esDuiValido(form.numero_documento)) {
      errores.numero_documento = 'Formato: 12345678-9';
    }
    if (form.telefono && !esTelefonoPaisValido(form.pais, form.telefono)) {
      errores.telefono = form.pais === 'El Salvador' ? 'Formato: 4322-2334' : 'Número inválido';
    }
    if (form.correo && !esCorreoValido(form.correo)) {
      errores.correo = 'Correo inválido';
    }
    // Departamento y distrito solo son obligatorios para DUI (cliente salvadoreño).
    // Con pasaporte (cliente extranjero) son opcionales.
    if (form.id_tipo_documento === TIPO_DUI) {
      if (!form.id_departamento) errores.id_departamento = 'Requerido';
      if (!form.id_distrito) errores.id_distrito = 'Requerido';
    }
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }

    setSaving(true);
    try {
      let mensaje;
      if (editingId) {
        await updateCliente(editingId, form);
        mensaje = 'Cliente actualizado';
      } else {
        await createCliente(form);
        mensaje = 'Cliente registrado';
      }
      setModalOpen(false);
      setExito(mensaje);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const filtrados = clientes.filter((c) => {
    if (soloFrecuentes && !c.es_frecuente) return false;
    // Búsqueda por palabras sueltas: cada término debe aparecer en documento/nombre completo.
    // Así "Kevin Flores" encuentra a "Kevin Javier Flores Mendoza" aunque haya nombres en medio.
    const texto = `${c.numero_documento} ${c.nombres} ${c.apellidos}`.toLowerCase();
    return filtro.toLowerCase().trim().split(/\s+/).every((palabra) => texto.includes(palabra));
  });
  const hayFrecuentes = clientes.some((c) => c.es_frecuente); // solo mostramos el filtro si la regla marca a alguien
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filtro, soloFrecuentes]); // volver a la página 1 al buscar/filtrar

  // Primera carga: TODA la pantalla se ve como esqueleto (no solo las filas).
  if (inicial) return <SkeletonListado columnas={6} />;

  return (
    <div className="admin-page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-subtitle">Registro y consulta de clientes del programa de fidelización</p>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      <div className="table-card">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 360 }}>
            <input
              className="filtro-input"
              placeholder="Buscar por documento o nombre..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 12, fontSize: 14, outline: 'none' }}
            />
            <svg
              className="filtro-lupa"
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          {/* Filtro: solo clientes frecuentes (aparece si la regla marca a alguien) */}
          {hayFrecuentes && (
            <button
              type="button"
              onClick={() => setSoloFrecuentes((v) => !v)}
              title="Mostrar solo los clientes frecuentes"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 800,
                border: soloFrecuentes ? '1px solid #f59e0b' : '2px solid #0D1BB8',
                background: soloFrecuentes ? '#fffbeb' : '#fff',
                color: soloFrecuentes ? '#b45309' : '#111827',
                transition: 'all 0.15s',
              }}
            >
              <EstrellaFrecuente activa={soloFrecuentes} />
              Solo frecuentes
            </button>
          )}
        </div>

        {!loading && filtrados.length === 0 ? (
          <p className="table-empty">
            {soloFrecuentes ? 'Ningún cliente frecuente con esa búsqueda' : 'No hay clientes registrados'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonFilas columnas={6} filas={8} />
              ) : pageItems.map((c) => (
                <tr key={c.id_cliente}>
                  <td><span className="badge-rol badge-doc">{c.tipo_documento}</span> {c.numero_documento}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {c.nombres} {c.apellidos}
                      {c.es_frecuente && (
                        <span title={`Cliente frecuente · ${c.transacciones_recientes} transacciones recientes`} style={{ display: 'inline-flex' }}>
                          <EstrellaFrecuente />
                        </span>
                      )}
                    </span>
                  </td>
                  <td>{c.telefono ? telefonoConCodigo(c.telefono, c.pais) : '—'}</td>
                  <td><strong>{c.puntos_acumulados}</strong></td>
                  <td>
                    <span className={`badge-estado estado-${c.estado?.toLowerCase()}`}>{c.estado}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn historial"
                        onClick={() => navigate(`/admin/historial?doc=${encodeURIComponent(c.numero_documento)}`)}
                        title="Ver historial"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v5h5" />
                          <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                          <path d="M12 7v5l4 2" />
                        </svg>
                      </button>
                      <button className="icon-btn edit" onClick={() => abrirEditar(c)} title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {c.correo && (
                        <button
                          className="icon-btn historial"
                          onClick={() => reenviar(c)}
                          disabled={reenviandoId === c.id_cliente}
                          title="Reenviar código de acceso al correo"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-10 5L2 7" />
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

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h3>

            <form className="modal-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div className="form-row">
                <div className="form-field">
                  <label>Tipo de documento</label>
                  <select name="id_tipo_documento" value={form.id_tipo_documento} onChange={handleChange}>
                    {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className={`form-field ${fieldErrors.numero_documento ? 'has-error' : ''}`}>
                  <label>
                    N° de documento
                    {fieldErrors.numero_documento && <span className="req-tag">{fieldErrors.numero_documento}</span>}
                  </label>
                  <input name="numero_documento" value={form.numero_documento} onChange={handleChange}
                    placeholder={form.id_tipo_documento === TIPO_DUI ? '12345678-9' : 'N° de pasaporte'} />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.nombres ? 'has-error' : ''}`}>
                  <label>
                    Nombres
                    {fieldErrors.nombres && <span className="req-tag">{fieldErrors.nombres}</span>}
                  </label>
                  <input name="nombres" value={form.nombres} onChange={handleChange} placeholder="Ej. María José" />
                </div>
                <div className={`form-field ${fieldErrors.apellidos ? 'has-error' : ''}`}>
                  <label>
                    Apellidos
                    {fieldErrors.apellidos && <span className="req-tag">{fieldErrors.apellidos}</span>}
                  </label>
                  <input name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="Ej. García López" />
                </div>
              </div>

              <div className="form-row">
                {/* País: define el código del teléfono. Con DUI queda fijo en El Salvador. */}
                <div className="form-field">
                  <label>
                    País {form.id_tipo_documento === TIPO_DUI && <span className="optional">(DUI: El Salvador)</span>}
                  </label>
                  <select name="pais" value={form.pais} onChange={handleChange} disabled={form.id_tipo_documento === TIPO_DUI}>
                    {PAISES.map((p) => (
                      <option key={p.nombre} value={p.nombre}>{p.bandera} {p.nombre} ({p.codigo})</option>
                    ))}
                  </select>
                </div>
                <div className={`form-field ${fieldErrors.telefono ? 'has-error' : ''}`}>
                  <label>
                    Teléfono <span className="optional">(opcional)</span>
                    {fieldErrors.telefono && <span className="req-tag">{fieldErrors.telefono}</span>}
                  </label>
                  <div className="tel-group">
                    <span className="tel-codigo">{getPais(form.pais).codigo}</span>
                    <input
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      inputMode="numeric"
                      placeholder={form.pais === 'El Salvador' ? '4322-2334' : 'Número'}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.correo ? 'has-error' : ''}`}>
                  <label>
                    Correo
                    {fieldErrors.correo && <span className="req-tag">{fieldErrors.correo}</span>}
                  </label>
                  <input type="email" name="correo" value={form.correo} onChange={handleChange} autoComplete="off" placeholder="ejemplo@correo.com" />
                </div>
                <div className="form-field">
                  <label>Fecha de nacimiento <span className="optional">(opcional)</span></label>
                  <DatePicker
                    size="compacto"
                    className="dp--bloque"
                    value={isoAFecha(form.fecha_nacimiento)}
                    onChange={(d) => handleChange({ target: { name: 'fecha_nacimiento', value: fechaAISO(d) } })}
                    placeholder="Elegir fecha"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.id_departamento ? 'has-error' : ''}`}>
                  <label>
                    Departamento {form.id_tipo_documento !== TIPO_DUI && <span className="optional">(opcional)</span>}
                    {fieldErrors.id_departamento && <span className="req-tag">{fieldErrors.id_departamento}</span>}
                  </label>
                  <select value={form.id_departamento ?? ''} onChange={onDepartamentoChange}>
                    <option value="">Seleccione...</option>
                    {departamentos.map((d) => (
                      <option key={d.id_departamento} value={d.id_departamento}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className={`form-field ${fieldErrors.id_distrito ? 'has-error' : ''}`}>
                  <label>
                    Distrito {form.id_tipo_documento !== TIPO_DUI && <span className="optional">(opcional)</span>}
                    {fieldErrors.id_distrito && <span className="req-tag">{fieldErrors.id_distrito}</span>}
                  </label>
                  <select value={form.id_distrito ?? ''} onChange={onDistritoChange} disabled={!form.id_departamento}>
                    <option value="">{form.id_departamento ? 'Seleccione...' : 'Elige un departamento'}</option>
                    {distritos.map((d) => (
                      <option key={d.id_distrito} value={d.id_distrito}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editingId && (
                <div className="form-row">
                  <div className="form-field">
                    <label>Estado</label>
                    <select name="id_estado" value={form.id_estado} onChange={handleChange}>
                      {form.id_estado === ESTADO_INACTIVO && <option value={ESTADO_INACTIVO} disabled>Inactivo</option>}
                      {ESTADOS_FORM.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Registrar cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exito && <ModalExito mensaje={exito} onCerrar={() => setExito(null)} />}
    </div>
  );
}
