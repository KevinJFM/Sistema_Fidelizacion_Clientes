import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getResumen } from '../../servicios/servicioTransacciones';
import './PaginasAdmin.css';
import './Inicio.css';

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (target === null || target === undefined || typeof target === 'string') {
      setValue(target);
      return;
    }
    const start = performance.now();
    const run = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(run);
      else setValue(target);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

const statIcons = [
  // Clientes
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>,
  // Transacciones
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>,
  // Ventas
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>,
  // Puntos
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>,
];

const statColors = [
  { bg: '#EEF0FC', icon: '#0D1BB8', glow: 'rgba(13,27,184,0.15)' },
  { bg: '#E8F5E9', icon: '#16a34a', glow: 'rgba(22,163,74,0.15)'  },
  { bg: '#FEF9EC', icon: '#D4A843', glow: 'rgba(212,168,67,0.15)' },
  { bg: '#FCE8F3', icon: '#E5388A', glow: 'rgba(229,56,138,0.15)' },
];

function StatCard({ label, value, hint, icon, color, index }) {
  const animated = useCountUp(typeof value === 'number' ? value : null);
  const display  = typeof value === 'number' ? animated : (value ?? '—');

  return (
    <motion.div
      className="stat-card-v2"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, boxShadow: `0 20px 48px ${color.glow}` }}
    >
      <div className="stat-icon-wrap" style={{ background: color.bg }}>
        <span style={{ color: color.icon }}>{icon}</span>
      </div>
      <div className="stat-body">
        <span className="stat-value-v2" style={{ color: color.icon }}>{display}</span>
        <span className="stat-label-v2">{label}</span>
        <span className="stat-hint-v2">{hint}</span>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    getResumen().then(setResumen).catch(() => {});
  }, []);

  const stats = [
    { label: 'Clientes registrados', value: resumen?.clientes_total ?? null,         hint: 'Total en el sistema' },
    { label: 'Transacciones de hoy',  value: resumen?.transacciones_hoy ?? null,       hint: 'Registradas hoy' },
    { label: 'Ventas de hoy',         value: resumen ? resumen.ventas_hoy : null,       hint: 'Total vendido hoy', prefix: '$' },
    { label: 'Puntos otorgados hoy',  value: resumen?.puntos_hoy ?? null,              hint: 'Generados hoy' },
  ];

  return (
    <div className="admin-page">

      {/* Hero banner */}
      <motion.div
        className="dashboard-hero"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="dashboard-hero-overlay" />
        <div className="dashboard-hero-content">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            Bienvenido al Sistema
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            Punta Diamantes · Fidelización de Clientes
          </motion.p>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="stats-grid-v2">
        {stats.map((s, i) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.prefix && s.value !== null ? `$${Number(s.value).toFixed(2)}` : s.value}
            hint={s.hint}
            icon={statIcons[i]}
            color={statColors[i]}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
