import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { setCredentials, limpiarSesionExpirada } from '../../redux/slices/sliceAuth';
import { login } from '../../servicios/servicioAuth';
import { inicioDeRol } from '../../utilidades/roles';
import Logo from '../../componentes/Logo/Logo';
import './Acceso.css';

const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Login() {
  const [showPass, setShowPass]       = useState(false);
  const [form, setForm]               = useState({ email: '', contrasena: '' });
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [avisoSesion, setAvisoSesion] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sesionExpirada = useSelector((s) => s.auth.sesionExpirada);

  // Si la sesión venció sola (401 sin refresh válido), avisa al llegar al login:
  // modal con "Aceptar" + toast. Se limpia la bandera para que no se repita.
  useEffect(() => {
    if (sesionExpirada) {
      setAvisoSesion(true);
      toast.error('Tu sesión expiró por seguridad. Vuelve a iniciar sesión.');
      dispatch(limpiarSesionExpirada());
    }
  }, [sesionExpirada, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errores = {};
    if (!form.email.trim()) errores.email = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errores.email = 'Email inválido';
    if (!form.contrasena.trim()) errores.contrasena = 'Requerido';
    if (Object.keys(errores).length > 0) { setFieldErrors(errores); return; }

    setLoading(true);
    setError('');
    try {
      const data = await login(form);
      dispatch(setCredentials(data));
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
      navigate(inicioDeRol(data.usuario.rol));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">

      {/* Panel izquierdo — foto del hotel */}
      <div className="login-hero">
        <div className="login-hero-overlay" />

        <motion.div
          className="login-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-logo-wrap">
            <Logo size={84} color="#E5388A" className="hero-logo-img" />
          </div>
          <h1 className="hero-title">Punta Diamantes</h1>
          <p className="hero-subtitle">Sistema de Fidelización de Clientes</p>

          <div className="hero-pills">
            <span className="hero-pill">🏨 Hospedaje</span>
            <span className="hero-pill">✨ Puntos</span>
            <span className="hero-pill">🎁 Beneficios</span>
          </div>
        </motion.div>

      </div>

      {/* Panel derecho — formulario */}
      <div className="login-side">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >

          {/* Logo visible sólo en mobile */}
          <div className="card-logo-mobile">
            <Logo size={56} color="#E5388A" />
          </div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <h2 className="card-title">Iniciar sesión</h2>
            <p className="card-subtitle">Accede a tu cuenta del hotel</p>
          </motion.div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="field-group">
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
                  type="email" name="email" id="email"
                  placeholder="tu@email.com"
                  value={form.email} onChange={handleChange} autoComplete="off"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="field-group">
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
                  name="contrasena" id="contrasena"
                  placeholder="••••••••"
                  value={form.contrasena} onChange={handleChange}
                />
                <button type="button" className="toggle-pass" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  className="login-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              className="submit-btn"
              disabled={loading}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <span className="spinner" /> : (
                <>
                  Iniciar sesión
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </motion.button>
          </form>

        </motion.div>
      </div>

      {/* Modal de sesión vencida: aparece al volver al login tras un 401 */}
      <AnimatePresence>
        {avisoSesion && (
          <motion.div
            className="sesion-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="sesion-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="sesion-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="sesion-title">Sesión expirada</h3>
              <p className="sesion-text">
                Tu sesión expiró por seguridad. Vuelve a iniciar sesión para continuar.
              </p>
              <button type="button" className="sesion-btn" onClick={() => setAvisoSesion(false)}>
                Aceptar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
