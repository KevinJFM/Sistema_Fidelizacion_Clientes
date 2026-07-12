import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../../servicios/servicioClientes';
import { getDepartamentos, getDistritos } from '../../servicios/servicioUbicaciones';
import { formatDui, formatTelefono, esDuiValido, esTelefonoValido, esCorreoValido } from '../../utilidades/formato';
import Paginacion, { PAGE_SIZE } from '../../componentes/Paginacion/Paginacion';
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
  correo: '',
  fecha_nacimiento: '',
  id_departamento: null,
  id_distrito: null,
  id_estado: 1,
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState('');
  const [page, setPage]         = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmCliente, setConfirmCliente] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [distritos, setDistritos]         = useState([]);

  const navigate = useNavigate();

  const cargar = async () => {
    setLoading(true);
    try {
      setClientes(await getClientes());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    getDepartamentos().then(setDepartamentos).catch(() => {});
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
    const { name } = e.target;
    let value = e.target.value;
    if (name.startsWith('id_')) value = Number(value);
    else if (name === 'telefono') value = formatTelefono(value);
    else if (name === 'numero_documento' && form.id_tipo_documento === TIPO_DUI) value = formatDui(value);
    setForm({ ...form, [name]: value });
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
    if (form.telefono && !esTelefonoValido(form.telefono)) {
      errores.telefono = 'Formato: 4322-2334';
    }
    if (form.correo && !esCorreoValido(form.correo)) {
      errores.correo = 'Correo inválido';
    }
    if (!form.id_departamento) errores.id_departamento = 'Requerido';
    if (!form.id_distrito) errores.id_distrito = 'Requerido';
    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCliente(editingId, form);
        toast.success('Cliente actualizado');
      } else {
        await createCliente(form);
        toast.success('Cliente registrado');
      }
      setModalOpen(false);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!confirmCliente) return;
    setDeleting(true);
    try {
      await deleteCliente(confirmCliente.id_cliente);
      toast.success('Cliente desactivado');
      setConfirmCliente(null);
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desactivar');
    } finally {
      setDeleting(false);
    }
  };

  const filtrados = clientes.filter((c) => {
    const t = filtro.toLowerCase();
    return (
      c.numero_documento.toLowerCase().includes(t) ||
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(t)
    );
  });
  const pageItems = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filtro]); // volver a la página 1 al buscar

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
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6' }}>
          <input
            className="filtro-input"
            placeholder="Buscar por documento o nombre..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: '100%', maxWidth: 360, padding: '10px 14px', borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
          />
        </div>

        {loading ? (
          <p className="table-empty">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p className="table-empty">No hay clientes registrados</p>
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
              {pageItems.map((c) => (
                <tr key={c.id_cliente}>
                  <td><span className="badge-rol">{c.tipo_documento}</span> {c.numero_documento}</td>
                  <td>{c.nombres} {c.apellidos}</td>
                  <td>{c.telefono || '—'}</td>
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
                      <button
                        className="icon-btn delete"
                        onClick={() => setConfirmCliente(c)}
                        disabled={c.id_estado === ESTADO_INACTIVO}
                        title={c.id_estado === ESTADO_INACTIVO ? 'Ya está inactivo' : 'Desactivar'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
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
                  <input name="nombres" value={form.nombres} onChange={handleChange} />
                </div>
                <div className={`form-field ${fieldErrors.apellidos ? 'has-error' : ''}`}>
                  <label>
                    Apellidos
                    {fieldErrors.apellidos && <span className="req-tag">{fieldErrors.apellidos}</span>}
                  </label>
                  <input name="apellidos" value={form.apellidos} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.telefono ? 'has-error' : ''}`}>
                  <label>
                    Teléfono
                    {fieldErrors.telefono && <span className="req-tag">{fieldErrors.telefono}</span>}
                  </label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="4322-2334" />
                </div>
                <div className={`form-field ${fieldErrors.correo ? 'has-error' : ''}`}>
                  <label>
                    Correo
                    {fieldErrors.correo && <span className="req-tag">{fieldErrors.correo}</span>}
                  </label>
                  <input type="email" name="correo" value={form.correo} onChange={handleChange} autoComplete="off" placeholder="ejemplo@correo.com" />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.id_departamento ? 'has-error' : ''}`}>
                  <label>
                    Departamento
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
                    Distrito
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

              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de nacimiento <span className="optional">(opcional)</span></label>
                  <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} />
                </div>
                {editingId && (
                  <div className="form-field">
                    <label>Estado</label>
                    <select name="id_estado" value={form.id_estado} onChange={handleChange}>
                      {form.id_estado === ESTADO_INACTIVO && <option value={ESTADO_INACTIVO} disabled>Inactivo</option>}
                      {ESTADOS_FORM.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

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

      {/* Modal confirmar desactivar */}
      {confirmCliente && (
        <div className="modal-overlay" onClick={() => setConfirmCliente(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Desactivar cliente?</h3>
            <p className="confirm-text">
              <strong>{confirmCliente.nombres} {confirmCliente.apellidos}</strong> pasará a estado inactivo.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmCliente(null)}>Cancelar</button>
              <button type="button" className="btn-danger" onClick={confirmarDesactivar} disabled={deleting}>
                {deleting ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
