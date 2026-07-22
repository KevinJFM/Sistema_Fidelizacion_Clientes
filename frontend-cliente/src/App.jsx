import { Routes, Route, Navigate } from 'react-router-dom';
import { ProveedorTema } from './tema/tema';
import { ProveedorAvisos } from './componentes/Avisos';
import Login from './paginas/Login.jsx';
import Bienvenida from './paginas/Bienvenida.jsx';
import Portal from './paginas/Portal.jsx';

// Guard simple: si no hay token, manda al login
function Privada({ children }) {
  const token = localStorage.getItem('portal_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ProveedorTema>
      <ProveedorAvisos>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/bienvenida" element={<Privada><Bienvenida /></Privada>} />
          <Route path="/" element={<Privada><Portal /></Privada>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProveedorAvisos>
    </ProveedorTema>
  );
}
