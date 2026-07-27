import { useEffect, useState } from 'react';
import { getPromociones, mensajeError } from '../servicios/servicioPortal';
import { usarAvisos } from '../componentes/Avisos';

// Convierte 'YYYY-MM-DD' en fecha local, sin desfase por zona horaria
const soloFecha = (valor) => {
  if (!valor) return null;
  const [y, m, d] = String(valor).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmtFecha = (fecha, conAno = true) =>
  fecha.toLocaleDateString('es-SV', { day: 'numeric', month: 'short', ...(conAno ? { year: 'numeric' } : {}) });

// Texto de vigencia según cómo se configuró la promoción
const textoVigencia = (promo) => {
  const especial = soloFecha(promo.fecha_especial);
  if (especial) return `Solo el ${fmtFecha(especial)}`;
  const ini = soloFecha(promo.fecha_inicio);
  const fin = soloFecha(promo.fecha_fin);
  if (ini && fin) {
    const mismoAno = ini.getFullYear() === fin.getFullYear();
    return `Del ${fmtFecha(ini, !mismoAno)} al ${fmtFecha(fin)}`;
  }
  if (fin) return `Hasta el ${fmtFecha(fin)}`;
  return null;
};

export default function Promociones() {
  const mostrarAviso = usarAvisos();
  const [promos, setPromos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getPromociones()
      .then((p) => setPromos(Array.isArray(p) ? p : []))
      .catch((err) => mostrarAviso('error', 'No se pudo cargar', mensajeError(err, 'No se pudieron cargar las promociones')))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="pt-centro"><div className="pt-spinner" /></div>;

  return (
    <div className="pt-pagina">
      <h2 className="pt-titulo-pagina">Promociones activas</h2>

      {promos.length === 0 ? (
        <div className="pt-caja-vacia">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          <p className="pt-vacio">No hay promociones activas por ahora.</p>
        </div>
      ) : (
        <div className="pt-promos">
          <div className="pt-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Las promociones se aplican al registrar tu consumo en el hotel.</span>
          </div>

          {promos.map((promo) => (
            <div key={promo.id_escenario} className="pt-promo">
              <div className="pt-promo-icono">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E5388A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div className="pt-promo-info">
                <p className="pt-promo-nombre">{promo.nombre}</p>
                <div className="pt-promo-fichas">
                  {Number(promo.puntos_extra) > 0 && <span className="pt-ficha pts">+{promo.puntos_extra} pts</span>}
                  {Number(promo.descuento_extra) > 0 && <span className="pt-ficha desc">{Number(promo.descuento_extra)}% descuento</span>}
                </div>
                {textoVigencia(promo) && (
                  <p className="pt-promo-fecha">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {textoVigencia(promo)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
