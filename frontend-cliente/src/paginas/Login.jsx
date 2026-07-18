import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginCliente, mensajeError } from '../servicios/servicioPortal';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ tipo_documento: 'DUI', numero_documento: '', pin: '' });
  const [verPin, setVerPin] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.numero_documento.trim()) return toast.error('Ingresa tu número de documento');
    if (!/^\d{4,6}$/.test(form.pin)) return toast.error('El PIN debe tener entre 4 y 6 dígitos');

    setCargando(true);
    try {
      const r = await loginCliente({
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento.trim(),
        pin: form.pin,
      });
      localStorage.setItem('portal_token', r.token);
      toast.success(r.message || 'Bienvenido');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(mensajeError(err, 'No se pudo iniciar sesión'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="pt-login">
      <div className="pt-login-card">
        <div className="pt-logo">
          <img src="/icono.svg" alt="Punta Diamantes" width="64" height="64" />
        </div>
        <h1 className="pt-brand">Punta Diamantes</h1>
        <p className="pt-sub">Consulta tus puntos de fidelidad</p>

        <form onSubmit={enviar} className="pt-form" noValidate>
          <label className="pt-field">
            <span>Tipo de documento</span>
            <select name="tipo_documento" value={form.tipo_documento} onChange={cambiar}>
              <option value="DUI">DUI</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </label>

          <label className="pt-field">
            <span>N° de documento</span>
            <input
              name="numero_documento"
              value={form.numero_documento}
              onChange={cambiar}
              placeholder={form.tipo_documento === 'DUI' ? '00000000-0' : 'Ej. A1234567'}
              autoComplete="off"
              inputMode={form.tipo_documento === 'DUI' ? 'numeric' : 'text'}
            />
          </label>

          <label className="pt-field">
            <span>PIN (4 a 6 dígitos)</span>
            <div className="pt-pin-wrap">
              <input
                name="pin"
                value={form.pin}
                onChange={cambiar}
                type={verPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                autoComplete="off"
              />
              <button type="button" className="pt-ver" onClick={() => setVerPin((v) => !v)} tabIndex={-1}>
                {verPin ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <button type="submit" className="pt-btn" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="pt-nota">
          Si es tu primera vez, el PIN que ingreses quedará guardado como tu clave.
          Si no reconoces tus datos, contacta al hotel.
        </p>
      </div>
    </div>
  );
}
