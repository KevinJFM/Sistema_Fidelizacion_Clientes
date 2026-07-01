import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { refreshSession } from './servicios/servicioAuth';
import { setCredentials, setBootstrapped } from './redux/slices/sliceAuth';
import Login from './paginas/Acceso/Acceso';
import StoreLayout from './paginas/Administracion/Panel';
import Dashboard from './paginas/Administracion/Inicio';
import Usuarios from './paginas/Modulos/Usuarios';
import Clientes from './paginas/Modulos/Clientes';
import Transacciones from './paginas/Modulos/Transacciones';
import Historial from './paginas/Modulos/Historial';
import HistorialCliente from './paginas/Modulos/HistorialCliente';
import Promociones from './paginas/Modulos/Promociones';

const AdminRoute = ({ children }) => {
  const { isAuth, user } = useSelector((state) => state.auth);
  if (!isAuth) return <Navigate to="/login" />;
  if (user?.rol !== 'admin') return <Navigate to="/" />;
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { bootstrapped } = useSelector((state) => state.auth);

  // Al cargar la app, intenta restaurar la sesión usando la cookie del refresh token
  useEffect(() => {
    refreshSession()
      .then((data) => dispatch(setCredentials(data)))
      .catch(() => {}) // sin sesión válida: se queda deslogueado
      .finally(() => dispatch(setBootstrapped()));
  }, [dispatch]);

  // Evita el parpadeo login→admin mientras se verifica la sesión
  if (!bootstrapped) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f1fb' }}>
        <div className="spinner" style={{ borderTopColor: '#0D1BB8', borderColor: 'rgba(13,27,184,0.2)', borderTopWidth: 3, width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#ffffff',
            color: '#0A1259',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 12px 32px rgba(13, 27, 184, 0.18)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#0D1BB8', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <StoreLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="transacciones" element={<Transacciones />} />
          <Route path="historial" element={<Historial />} />
          <Route path="historial-cliente" element={<HistorialCliente />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="promociones" element={<Promociones />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
