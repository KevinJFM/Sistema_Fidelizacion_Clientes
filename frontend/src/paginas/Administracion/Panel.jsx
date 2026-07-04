import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { logout } from '../../redux/slices/sliceAuth';
import { logoutRequest } from '../../servicios/servicioAuth';
import ThemeToggle from '../../tema/SelectorTema';
import Logo from '../../componentes/Logo/Logo';
import './Panel.css';

const navItems = [
  {
    to: '/admin', end: true, label: 'Dashboard', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>),
  },
  {
    to: '/admin/clientes', label: 'Clientes', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>),
  },
  {
    to: '/admin/transacciones', label: 'Transacciones', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>),
  },
  {
    to: '/admin/historial', label: 'Historial', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>),
  },
  {
    to: '/admin/historial-cliente', label: 'Perfil Cliente', roles: ['admin', 'recepcionista', 'empleado'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /><polyline points="15 14 17 16 21 12" /></svg>),
  },
  {
    to: '/admin/operadores', label: 'Tour Operadores', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  },
  {
    to: '/admin/operadores-historial', label: 'Historial Operadores', roles: ['admin', 'recepcionista'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>),
  },
  {
    to: '/admin/promociones', label: 'Promociones', roles: ['admin'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8" y2="14" strokeWidth="3" strokeLinecap="round" /><line x1="12" y1="14" x2="12" y2="14" strokeWidth="3" strokeLinecap="round" /><line x1="16" y1="14" x2="16" y2="14" strokeWidth="3" strokeLinecap="round" /></svg>),
  },
  {
    to: '/admin/usuarios', label: 'Usuarios', roles: ['admin'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  },
  {
    to: '/admin/configuracion', label: 'Configuración', roles: ['admin'],
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
  },
];

const sidebarVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const linkVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function StoreLayout() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useSelector((state) => state.auth);

  const handleLogout = async () => {
    try { await logoutRequest(); } catch {}
    dispatch(logout());
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.rol));

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <motion.div
          className="sidebar-brand"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="sidebar-logo">
            <Logo size="100%" />
          </div>
        </motion.div>

        <motion.nav
          className="sidebar-nav"
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
        >
          {visibleItems.map((item) => (
            <motion.div key={item.to} variants={linkVariants}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <motion.span
                      className="nav-icon"
                      animate={{ rotate: isActive ? [0, -8, 8, 0] : 0 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    >
                      {item.icon}
                    </motion.span>
                    <span className="nav-label">{item.label}</span>
                    {isActive && (
                      <motion.span
                        className="nav-active-dot"
                        layoutId="activeDot"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>

        <motion.button
          className="sidebar-logout"
          onClick={handleLogout}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Cerrar sesión</span>
        </motion.button>
      </aside>

      {/* Contenido */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-title">Panel de Administración</div>
          <ThemeToggle user={user} />
        </header>

        <main className="admin-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
