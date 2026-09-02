import { useCallback, useEffect, useRef, useState } from 'react';
import { getMisMovimientos } from '../servicios/servicioPortal';

// Recuerda hasta qué movimiento ya vio el cliente (para el globito de "nuevas")
const CLAVE_VISTO = 'notif_ultimo_visto';

// Convierte un movimiento de puntos en un mensaje de notificación amigable
function aNotificacion(movimiento) {
  const puntos = Number(movimiento.puntos) || 0;
  const abs = Math.abs(puntos);
  const plural = abs === 1 ? 'punto' : 'puntos';

  // Ajuste (ej. anulación de una transacción): no es un canje. Lleva su propio ícono y texto.
  if (movimiento.tipo === 'ajuste') {
    return {
      color: '#dc2626',
      icono: 'anulado',
      titulo: puntos < 0 ? `Se revirtieron ${abs} ${plural}` : `Se te devolvieron ${abs} ${plural}`,
      detalle: movimiento.descripcion || 'Ajuste de puntos',
    };
  }

  // Canje real: tipo 'canjeado' (los puntos negativos que no son ajuste).
  if (movimiento.tipo === 'canjeado') {
    return { color: '#E5388A', icono: 'gift', titulo: `Canjeaste ${abs} ${plural}`, detalle: movimiento.descripcion || 'Canje de puntos en recepción' };
  }
  return { color: '#16a34a', icono: 'mas', titulo: `Acumulaste ${abs} ${plural}`, detalle: movimiento.descripcion || 'Puntos ganados por tu consumo' };
}

// Fecha corta y en palabras
const fechaRelativa = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' });
};

const IconoMov = ({ tipo, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {tipo === 'gift' ? (
      <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>
    ) : tipo === 'anulado' ? (
      <><circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" /></>
    ) : (
      <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></>
    )}
  </svg>
);

export default function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ultimoVisto, setUltimoVisto] = useState(() => Number(localStorage.getItem(CLAVE_VISTO)) || 0);
  const refPanel = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const historial = await getMisMovimientos();
      const lista = Array.isArray(historial) ? historial : [];
      setMovimientos(lista);
      return lista;
    } catch {
      return null; // silencioso: la campana nunca debe romper el portal
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Refresca al volver a la pestaña (por si hubo un movimiento nuevo)
  useEffect(() => {
    const alEnfocar = () => cargar();
    window.addEventListener('focus', alEnfocar);
    return () => window.removeEventListener('focus', alEnfocar);
  }, [cargar]);

  // Cerrar al hacer clic fuera del panel
  useEffect(() => {
    if (!abierto) return;
    const alClic = (e) => { if (refPanel.current && !refPanel.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  const noLeidas = movimientos.filter((m) => (Number(m.id_movimiento) || 0) > ultimoVisto).length;

  const abrir = async () => {
    const abrirAhora = !abierto;
    setAbierto(abrirAhora);
    if (!abrirAhora) return;
    const lista = (await cargar()) || movimientos;
    const maxId = lista.reduce((max, m) => Math.max(max, Number(m.id_movimiento) || 0), 0);
    if (maxId > ultimoVisto) {
      localStorage.setItem(CLAVE_VISTO, String(maxId));
      setUltimoVisto(maxId);
    }
  };

  return (
    <div className="pt-campana" ref={refPanel}>
      <button className="pt-campana-boton" onClick={abrir} aria-label="Notificaciones">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {noLeidas > 0 && <span className="pt-campana-globo">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierto && (
        <div className="pt-campana-panel">
          <div className="pt-campana-encabezado">
            <span>Notificaciones</span>
            <button className="pt-campana-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button>
          </div>

          {cargando ? (
            <div className="pt-campana-centro"><div className="pt-spinner pequeno" /></div>
          ) : movimientos.length === 0 ? (
            <div className="pt-campana-centro"><p className="pt-vacio">Aún no tienes notificaciones.</p></div>
          ) : (
            <div className="pt-campana-lista">
              {movimientos.map((m) => {
                const n = aNotificacion(m);
                return (
                  <div key={m.id_movimiento} className="pt-campana-item">
                    <div className="pt-campana-icono" style={{ backgroundColor: `${n.color}22` }}>
                      <IconoMov tipo={n.icono} color={n.color} />
                    </div>
                    <div className="pt-campana-texto">
                      <p className="pt-campana-titulo">{n.titulo}</p>
                      <p className="pt-campana-detalle">{n.detalle}</p>
                      <p className="pt-campana-fecha">{fechaRelativa(m.fecha)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
