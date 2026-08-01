import { Component } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import './ErrorBoundary.css';

// Captura errores de renderizado y muestra una pantalla amable con opción de recargar (en vez de dejarla en blanco). Debe ser componente de clase: React solo captura estos errores así.
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Queda en consola para diagnóstico; no vuelve a romper la app.
    console.error('Error capturado por ErrorBoundary:', error, info);
    // Toast de aviso; el fallback monta su propio <Toaster> (el de la app queda desmontado).
    toast.error('Algo salió mal. Recarga la página para continuar.');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-root">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff', color: '#0A1259', borderRadius: '14px',
                fontSize: '14px', fontWeight: 600,
                boxShadow: '0 12px 32px rgba(13, 27, 184, 0.18)', padding: '12px 16px',
              },
              error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
          <div className="eb-card">
            <div className="eb-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="eb-title">Algo salió mal</h1>
            <p className="eb-text">
              Ocurrió un problema inesperado. Puedes recargar la página para continuar.
              Si el problema sigue, contacta al administrador.
            </p>
            <button className="eb-btn" onClick={() => window.location.reload()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
