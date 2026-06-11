import { useState, useEffect } from 'react';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from '../../services/userService';
import '../Admin/AdminPages.css';
import './Usuarios.css';

const ROLES = [
  { id: 1, label: 'Admin' },
  { id: 2, label: 'Cajero' },
  { id: 3, label: 'Cliente' },
];
const ESTADOS = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Inactivo' },
  { id: 3, label: 'Suspendido' },
];

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8,   label: 'Mínimo 8 caracteres' },
  { test: (v) => /[A-Z]/.test(v), label: 'Una letra mayúscula' },
  { test: (v) => /[a-z]/.test(v), label: 'Una letra minúscula' },
  { test: (v) => /[0-9]/.test(v), label: 'Un número' },
];

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

  const abrirCrear = () => {
    setEditingId(null);
    setForm(emptyForm);
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
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name.startsWith('id_') ? Number(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar contraseña si se ingresó (obligatoria al crear, opcional al editar)
    if (form.contrasena) {
      const falla = PASSWORD_RULES.find((rule) => !rule.test(form.contrasena));
      if (falla) {
        setError(`La contraseña no cumple: ${falla.label.toLowerCase()}`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateUsuario(editingId, form);
      } else {
        await createUsuario(form);
      }
      setModalOpen(false);
      await cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`¿Desactivar al usuario ${u.nombre} ${u.apellido}?`)) return;
    try {
      await deleteUsuario(u.id_usuario);
      await cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al desactivar');
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
              {usuarios.map((u) => (
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
                      <button className="icon-btn delete" onClick={() => handleDelete(u)} title="Desactivar">
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

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {editingId ? 'Editar usuario' : 'Nuevo usuario'}
            </h3>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label>Nombre</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label>Apellido</label>
                  <input name="apellido" value={form.apellido} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} required />
                </div>
                <div className="form-field">
                  <label>Rol</label>
                  <select name="id_rol" value={form.id_rol} onChange={handleChange}>
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>
                    Contraseña {editingId && <span className="optional">(opcional)</span>}
                  </label>
                  <input
                    type="password"
                    name="contrasena"
                    value={form.contrasena}
                    onChange={handleChange}
                    required={!editingId}
                  />
                </div>
                {editingId && (
                  <div className="form-field">
                    <label>Estado</label>
                    <select name="id_estado" value={form.id_estado} onChange={handleChange}>
                      {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {form.contrasena && (
                <ul className="password-rules">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.contrasena);
                    return (
                      <li key={rule.label} className={ok ? 'ok' : ''}>
                        <span className="rule-dot">{ok ? '✓' : '○'}</span>
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
    </div>
  );
}
