import './AdminPages.css';

const stats = [
  { label: 'Clientes activos', value: '—', hint: 'Pendiente de conectar' },
  { label: 'Puntos canjeados', value: '—', hint: 'Pendiente de conectar' },
  { label: 'Usuarios totales', value: '—', hint: 'Pendiente de conectar' },
  { label: 'Recompensas', value: '—', hint: 'Pendiente de conectar' },
];

export default function Dashboard() {
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
