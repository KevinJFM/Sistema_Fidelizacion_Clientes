import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login/Login';
import StoreLayout from './pages/Admin/StoreLayout';
import Dashboard from './pages/Admin/Dashboard';
import Usuarios from './pages/User/Usuarios';

const AdminRoute = ({ children }) => {
  const { isAuth, user } = useSelector((state) => state.auth);
  if (!isAuth) return <Navigate to="/login" />;
  if (user?.rol !== 'admin') return <Navigate to="/" />;
  return children;
};

function App() {
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
          <Route path="usuarios" element={<Usuarios />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
