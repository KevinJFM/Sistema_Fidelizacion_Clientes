import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from '../../services/userService';
import { formatTelefono, esTelefonoValido } from '../../utils/format';
import '../Admin/AdminPages.css';
import './Usuarios.css';

const ROLES = [
  { id: 1, label: 'Admin' },
  { id: 2, label: 'Cajero' },
  { id: 3, label: 'Cliente' },
];
const ESTADO_INACTIVO = 2;

// Opciones seleccionables en el formulario (Inactivo se maneja con el botón de desactivar)
const ESTADOS_FORM = [
  { id: 1, label: 'Activo' },
  { id: 3, label: 'Suspendido' },
];

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8,   label: 'Mínimo 8 caracteres' },
  { test: (v) => /[A-Z]/.test(v), label: 'Una letra mayúscula' },
  { test: (v) => /[a-z]/.test(v), label: 'Una letra minúscula' },
  { test: (v) => /[0-9]/.test(v), label: 'Un número' },
];

const PAGE_SIZE = 5;

// Genera los números de página con elipsis cuando hay muchas
const getPages = (total, current) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const emptyForm = {
  nombre: '',
  apellido: '',
  email: '',
  contrasena: '',
  telefono: '',
  fecha_nacimiento: '',
  id_rol: 3,
  id_estado: 1,
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPass, setShowPass]   = useState(false);
  const [confirmUser, setConfirmUser] = useState(null); // usuario pendiente de desactivar
  const [deleting, setDeleting]   = useState(false);
  const [passTried, setPassTried] = useState(false); // intentó guardar con contraseña inválida
  const [page, setPage]           = useState(1);

  const cargarUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Datos de la página actual
  const totalPages = Math.max(1, Math.ceil(usuarios.length / PAGE_SIZE));
  const pageItems  = usuarios.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Si la página actual queda fuera de rango (ej. tras borrar), se ajusta
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const abrirCrear = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setShowPass(false);
    setPassTried(false);
    setModalOpen(true);
  };

  const abrirEditar = (u) => {
    setEditingId(u.id_usuario);
    setForm({
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      contrasena: '',
      telefono: u.telefono,
      fecha_nacimiento: u.fecha_nacimiento?.slice(0, 10) ?? '',
      id_rol: u.id_rol,
      id_estado: u.id_estado,
    });
    setFieldErrors({});
    setShowPass(false);
    setPassTried(false);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name.startsWith('id_')) value = Number(value);
    else if (name === 'telefono') value = formatTelefono(value);
    setForm({ ...form, [name]: value });
    // Al escribir, se limpia el error de ese campo
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

    // Validar campos requeridos (contraseña solo es obligatoria al crear)
    const requeridos = ['nombre', 'apellido', 'email', 'telefono', 'fecha_nacimiento'];
    if (!editingId) requeridos.push('contrasena');

    const errores = {};
    requeridos.forEach((campo) => {
      if (!String(form[campo]).trim()) errores[campo] = 'Requerido';
    });

    // Validar formato del email (solo si no está vacío)
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errores.email = 'Email inválido';
    }
    // Validar formato del teléfono
    if (form.telefono && !esTelefonoValido(form.telefono)) {
      errores.telefono = 'Formato: 4322-2334';
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }

    // Validar contraseña si se ingresó (obligatoria al crear, opcional al editar)
    if (form.contrasena) {
      const faltantes = PASSWORD_RULES.filter((rule) => !rule.test(form.contrasena));
      if (faltantes.length > 0) {
        setPassTried(true);
        toast.error(
          `A la contraseña le falta: ${faltantes.map((r) => r.label.toLowerCase()).join(', ')}`
        );
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateUsuario(editingId, form);
        toast.success('Usuario actualizado');
      } else {
        await createUsuario(form);
        toast.success('Usuario creado');
      }
      setModalOpen(false);
      await cargarUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmarDesactivar = async () => {
    if (!confirmUser) return;
    setDeleting(true);
    try {
      await deleteUsuario(confirmUser.id_usuario);
      toast.success('Usuario desactivado');
      setConfirmUser(null);
      await cargarUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al desactivar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Usuarios</h2>
          <p className="page-subtitle">Gestión de usuarios del sistema</p>
        </div>
        <button className="btn-primary" onClick={abrirCrear}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <div className="table-card">
        {loading ? (
          <p className="table-empty">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="table-empty">No hay usuarios registrados</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre} {u.apellido}</td>
                  <td>{u.email}</td>
                  <td>{u.telefono}</td>
                  <td><span className="badge-rol">{u.rol}</span></td>
                  <td>
                    <span className={`badge-estado estado-${u.estado?.toLowerCase()}`}>
                      {u.estado}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn edit" onClick={() => abrirEditar(u)} title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => setConfirmUser(u)}
                        disabled={u.id_estado === ESTADO_INACTIVO}
                        title={u.id_estado === ESTADO_INACTIVO ? 'Ya está inactivo' : 'Desactivar'}
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

        {/* Paginación */}
        {!loading && usuarios.length > PAGE_SIZE && (
          <div className="pagination">
            <span className="page-info">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, usuarios.length)} de {usuarios.length}
            </span>

            <div className="page-controls">
              <button
                className="page-btn nav"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                title="Anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {getPages(totalPages, page).map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="page-dots">…</span>
                ) : (
                  <button
                    key={p}
                    className={`page-btn ${p === page ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                className="page-btn nav"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                title="Siguiente"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {editingId ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>

            <form className="modal-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              <div className="form-row">
                <div className={`form-field ${fieldErrors.nombre ? 'has-error' : ''}`}>
                  <label>
                    Nombre
                    {fieldErrors.nombre && <span className="req-tag">{fieldErrors.nombre}</span>}
                  </label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} />
                </div>
                <div className={`form-field ${fieldErrors.apellido ? 'has-error' : ''}`}>
                  <label>
                    Apellido
                    {fieldErrors.apellido && <span className="req-tag">{fieldErrors.apellido}</span>}
                  </label>
                  <input name="apellido" value={form.apellido} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.email ? 'has-error' : ''}`}>
                  <label>
                    Email
                    {fieldErrors.email && <span className="req-tag">{fieldErrors.email}</span>}
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} autoComplete="off" />
                </div>
                <div className={`form-field ${fieldErrors.telefono ? 'has-error' : ''}`}>
                  <label>
                    Teléfono
                    {fieldErrors.telefono && <span className="req-tag">{fieldErrors.telefono}</span>}
                  </label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="4322-2334" />
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.fecha_nacimiento ? 'has-error' : ''}`}>
                  <label>
                    Fecha de nacimiento
                    {fieldErrors.fecha_nacimiento && <span className="req-tag">{fieldErrors.fecha_nacimiento}</span>}
                  </label>
                  <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Rol</label>
                  <select name="id_rol" value={form.id_rol} onChange={handleChange}>
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className={`form-field ${fieldErrors.contrasena ? 'has-error' : ''}`}>
                  <label>
                    Contraseña {editingId && <span className="optional">(opcional)</span>}
                    {fieldErrors.contrasena && <span className="req-tag">{fieldErrors.contrasena}</span>}
                  </label>
                  <div className="input-pass">
                    <input
                      type={showPass ? 'text' : 'password'}
                      name="contrasena"
                      value={form.contrasena}
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="toggle-pass-modal"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                      title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPass ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {editingId && (
                  <div className="form-field">
                    <label>Estado</label>
                    <select name="id_estado" value={form.id_estado} onChange={handleChange}>
                      {form.id_estado === ESTADO_INACTIVO && (
                        <option value={ESTADO_INACTIVO} disabled>Inactivo</option>
                      )}
                      {ESTADOS_FORM.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {form.contrasena && (
                <ul className="password-rules">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.contrasena);
                    return (
                      <li key={rule.label} className={ok ? 'ok' : (passTried ? 'fail' : '')}>
                        <span className="rule-dot">{ok ? '✓' : (passTried ? '✗' : '○')}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Crear usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para desactivar */}
      {confirmUser && (
        <div className="modal-overlay" onClick={() => setConfirmUser(null)}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="confirm-title">¿Desactivar usuario?</h3>
            <p className="confirm-text">
              <strong>{confirmUser.nombre} {confirmUser.apellido}</strong> pasará a estado
              inactivo y no podrá iniciar sesión hasta que lo actives de nuevo.
            </p>
            <div className="modal-actions confirm-actions">
              <button type="button" className="btn-ghost" onClick={() => setConfirmUser(null)}>
                Cancelar
              </button>
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
