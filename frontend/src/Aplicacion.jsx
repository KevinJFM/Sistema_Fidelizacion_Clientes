import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { refreshSession } from './servicios/servicioAuth';
import { inicioDeRol } from './utilidades/roles';
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
import Configuracion from './paginas/Modulos/Configuracion';
import Operadores from './paginas/Modulos/Operadores';
import HistorialOperadores from './paginas/Modulos/HistorialOperadores';
import IntegracionPos from './paginas/Modulos/IntegracionPos';

// Requiere sesión iniciada (cualquier rol)
const RequireAuth = ({ children }) => {
  const { isAuth } = useSelector((state) => state.auth);
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
};

// Requiere que el rol del usuario esté en la lista; si no, lo manda a su inicio
const RequireRole = ({ roles, children }) => {
  const { isAuth, user } = useSelector((state) => state.auth);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.rol)) return <Navigate to={inicioDeRol(user?.rol)} replace />;
  return children;
};

// Módulo Integración POS: solo admin y solo si el backend lo habilita (POS_ENABLED).
// Si está oculto, entrar por URL redirige al panel.
const RequirePos = ({ children }) => {
  const { isAuth, user, posHabilitado } = useSelector((state) => state.auth);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (user?.rol !== 'admin' || !posHabilitado) return <Navigate to={inicioDeRol(user?.rol)} replace />;
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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F4F6FE' }}>
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
            <RequireAuth>
              <StoreLayout />
            </RequireAuth>
          }
        >
          <Route index element={<RequireRole roles={['admin', 'recepcionista']}><Dashboard /></RequireRole>} />
          <Route path="clientes" element={<RequireRole roles={['admin', 'recepcionista']}><Clientes /></RequireRole>} />
          <Route path="transacciones" element={<RequireRole roles={['admin', 'recepcionista']}><Transacciones /></RequireRole>} />
          <Route path="historial" element={<RequireRole roles={['admin', 'recepcionista']}><Historial /></RequireRole>} />
          <Route path="historial-cliente" element={<RequireRole roles={['admin', 'recepcionista', 'empleado']}><HistorialCliente /></RequireRole>} />
          <Route path="operadores" element={<RequireRole roles={['admin', 'recepcionista']}><Operadores /></RequireRole>} />
          <Route path="operadores-historial" element={<RequireRole roles={['admin', 'recepcionista']}><HistorialOperadores /></RequireRole>} />
          <Route path="usuarios" element={<RequireRole roles={['admin']}><Usuarios /></RequireRole>} />
          <Route path="promociones" element={<RequireRole roles={['admin']}><Promociones /></RequireRole>} />
          <Route path="configuracion" element={<RequireRole roles={['admin']}><Configuracion /></RequireRole>} />
          <Route path="integracion-pos" element={<RequirePos><IntegracionPos /></RequirePos>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
