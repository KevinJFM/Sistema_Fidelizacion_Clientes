import { useNavigate, Navigate } from 'react-router-dom';
import Logo from '../componentes/Logo';

export default function Bienvenida() {
  const navigate = useNavigate();

  // Si no hay sesión, no debería estar aquí
  if (!localStorage.getItem('portal_token')) {
    return <Navigate to="/login" replace />;
  }

  const continuar = () => {
    localStorage.setItem('bienvenida_vista', '1');
    navigate('/', { replace: true });
  };

  return (
    <div className="pt-bienvenida">
      <div className="pt-bienvenida-centro">
        <div className="pt-bienvenida-logo"><Logo size={124} color="#E5388A" /></div>
        <h1 className="pt-bienvenida-titulo">Te damos la bienvenida<br />a Punta Diamantes 🎉</h1>
        <p className="pt-bienvenida-sub">
          Consulta tus puntos, descubre tus recompensas y las promociones activas del hotel.
        </p>
      </div>
      <button className="pt-btn" onClick={continuar}>Continuar</button>
    </div>
  );
}
