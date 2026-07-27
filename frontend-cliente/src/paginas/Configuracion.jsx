import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usarAvisos } from '../componentes/Avisos';
import { usarTema } from '../tema/tema';
import { cerrarSesionApp, mensajeError } from '../servicios/servicioPortal';

export default function Configuracion() {
  const navigate = useNavigate();
  const mostrarAviso = usarAvisos();
  const { oscuro, alternarTema } = usarTema();
  const [cerrando, setCerrando] = useState(false);
  const [cerrandoApp, setCerrandoApp] = useState(false);
  const [enLinea, setEnLinea] = useState(navigator.onLine);

  // Cierra de forma remota la sesión de la APP (por si el teléfono se perdió/robó)
  const cerrarApp = async () => {
    if (!navigator.onLine) {
      return mostrarAviso('error', 'Sin conexión', 'Necesitas internet para hacer esto.');
    }
    setCerrandoApp(true);
    try {
      const r = await cerrarSesionApp();
      mostrarAviso('info', r.cerrada ? 'Sesión de la app cerrada' : 'Sin sesión de la app', r.message);
    } catch (err) {
      mostrarAviso('error', 'No se pudo', mensajeError(err, 'Inténtalo de nuevo.'));
    } finally {
      setCerrandoApp(false);
    }
  };

  // Detecta si el dispositivo tiene o no conexión (para bloquear el cierre de sesión)
  useEffect(() => {
    const conectado = () => setEnLinea(true);
    const desconectado = () => setEnLinea(false);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);

  const salir = () => {
    // Cerrar sesión requiere internet: para volver a entrar se necesita un código nuevo.
    if (!navigator.onLine) {
      return mostrarAviso(
        'error',
        'Sin conexión',
        'Necesitas internet para cerrar sesión, porque deberás ingresar de nuevo con un código.'
      );
    }
    setCerrando(true);
    localStorage.removeItem('portal_token');
    // Pequeña pausa para que se note el "Cerrando sesión…"
    setTimeout(() => navigate('/login', { replace: true }), 900);
  };

  return (
    <div className="pt-pagina">
      {cerrando && (
        <div className="pt-cerrando">
          <div className="pt-spinner" />
          <p>Cerrando sesión…</p>
        </div>
      )}

      <h2 className="pt-titulo-pagina">Configuración</h2>

      {/* Modo claro / oscuro */}
      <div className="pt-config-card">
        <div className="pt-config-fila">
          <div className="pt-config-izq">
            {oscuro ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            )}
            <span>{oscuro ? 'Modo oscuro' : 'Modo claro'}</span>
          </div>
          <button
            className={`pt-interruptor ${oscuro ? 'encendido' : ''}`}
            onClick={alternarTema}
            aria-label="Cambiar tema"
          >
            <span className="pt-perilla" />
          </button>
        </div>
        <p className="pt-config-ayuda">Cambia entre tema claro y oscuro.</p>
      </div>

      {/* Seguridad: cerrar la sesión de la app de forma remota */}
      <div className="pt-config-card">
        <div className="pt-config-izq">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
          <span>Seguridad</span>
        </div>
        <p className="pt-config-ayuda">¿Perdiste o te robaron el teléfono con la app abierta? Cierra su sesión.</p>
        <button
          className="pt-btn-salir"
          style={{ marginTop: 12 }}
          onClick={cerrarApp}
          disabled={!enLinea || cerrandoApp}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>
          {cerrandoApp ? 'Cerrando…' : 'Cerrar sesión de la app'}
        </button>
      </div>

      {/* Cerrar sesión */}
      <div className="pt-salir-info">
        <p className="pt-salir-1">Presiona el botón</p>
        <p className="pt-salir-2">Deberás ingresar tus datos de nuevo</p>
      </div>
      <button className="pt-btn-salir" onClick={salir} disabled={!enLinea}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        Cerrar sesión
      </button>
      {!enLinea && (
        <p className="pt-salir-offline">Sin conexión: necesitas internet para cerrar sesión.</p>
      )}

      <div className="pt-pie">
        <p>Punta Diamantes · Fidelización de Clientes</p>
      </div>
    </div>
  );
}
