import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './paginas/Login.jsx';
import MisPuntos from './paginas/MisPuntos.jsx';

// Guard simple: si no hay token, manda al login
function Privada({ children }) {
  const token = localStorage.getItem('portal_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Privada>
            <MisPuntos />
          </Privada>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
