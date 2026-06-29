import { useState, useEffect } from 'react';
import { getResumen } from '../../servicios/servicioTransacciones';
import './PaginasAdmin.css';

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    getResumen()
      .then(setResumen)
      .catch(() => {}); // si falla, se muestran guiones
  }, []);

  const stats = [
    { label: 'Clientes registrados', value: resumen?.clientes_total ?? '—',         hint: 'Total en el sistema' },
    { label: 'Transacciones de hoy',  value: resumen?.transacciones_hoy ?? '—',       hint: 'Registradas hoy' },
    { label: 'Ventas de hoy',         value: resumen ? `$${resumen.ventas_hoy.toFixed(2)}` : '—', hint: 'Total vendido hoy' },
    { label: 'Puntos otorgados hoy',  value: resumen?.puntos_hoy ?? '—',              hint: 'Generados hoy' },
  ];

  return (
    <div className="admin-page">
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">Resumen general del sistema de fidelización</p>

      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
            <span className="stat-hint">{s.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
