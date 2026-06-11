import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { setCredentials } from '../../redux/slices/authSlice';
import { login } from '../../services/authService';
import './Login.css';

const ROLE_REDIRECT = {
  admin:   '/admin/',
  cajero:  '/cajero/',
  cliente: '/cliente/',
};

export default function Login() {
  const [showPass, setShowPass]   = useState(false);
  const [form, setForm]           = useState({ email: '', contrasena: '' });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
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

    // Validar campos antes de enviar
    const errores = {};
    if (!form.email.trim()) {
      errores.email = 'Requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errores.email = 'Email inválido';
    }
    if (!form.contrasena.trim()) {
      errores.contrasena = 'Requerido';
    }

    if (Object.keys(errores).length > 0) {
      setFieldErrors(errores);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await login(form);
      dispatch(setCredentials(data));
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
      navigate(ROLE_REDIRECT[data.usuario.rol] ?? '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">

      {/* Card principal */}
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <div className="logo-badge">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
            </svg>
          </div>
          <h1>FidelizApp</h1>
          <p>Bienvenido de nuevo</p>
        </div>

        {/* Formulario */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>

          <div className="field-group">
            <label htmlFor="email">
              Correo electrónico
              {fieldErrors.email && <span className="req-tag">{fieldErrors.email}</span>}
            </label>
            <div className={`input-clay ${fieldErrors.email ? 'has-error' : ''}`}>
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="contrasena">
              Contraseña
              {fieldErrors.contrasena && <span className="req-tag">{fieldErrors.contrasena}</span>}
            </label>
            <div className={`input-clay ${fieldErrors.contrasena ? 'has-error' : ''}`}>
              <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                name="contrasena"
                id="contrasena"
                placeholder="••••••••"
                value={form.contrasena}
                onChange={handleChange}
              />
              <button
                type="button"
                className="toggle-pass"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
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

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : (
              <>
                Iniciar sesión
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
