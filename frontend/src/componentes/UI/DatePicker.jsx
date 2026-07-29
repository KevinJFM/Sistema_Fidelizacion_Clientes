import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './DatePicker.css';

/* ============================================================
   DatePicker reutilizable del panel (componente UI/DatePicker).
   Selector de fecha "premium": botón con gradiente + calendario
   desplegable con 3 vistas navegables (días → meses → años).
   Sin librerías externas. Combina con UI/Boton y UI/Campo.

   El calendario se renderiza en un PORTAL con posición fija: así
   nunca se recorta dentro de modales con overflow, y se abre hacia
   arriba automáticamente si no hay espacio abajo.

   Uso (con Date):
     const [fecha, setFecha] = useState(null);
     <DatePicker value={fecha} onChange={setFecha} />

   Uso dentro de un form que guarda 'yyyy-mm-dd' (helpers exportados):
     <DatePicker
       value={isoAFecha(form.fecha_nacimiento)}
       onChange={(d) => handleChange({ target: { name: 'fecha_nacimiento', value: fechaAISO(d) } })}
     />

   Props:
     value        Date | null   -> fecha seleccionada
     onChange     (Date) => void -> se llama al elegir un día
     placeholder  string         -> texto cuando no hay fecha
     size         'grande'       -> botón azul con gradiente (por defecto)
                  'compacto'     -> igual tamaño que UI/Campo (blanco, borde
                                    azul, 42px) para filas de filtros
     label        string         -> etiqueta arriba del campo (como UI/Campo)
     min / max    Date           -> límites seleccionables (opcional)
     disabled     bool
     className    string         -> clases extra en el contenedor
   ============================================================ */

const MESES        = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS_CORTOS  = ['DO','LU','MA','MI','JU','VI','SA'];

// Compara solo año/mes/día (ignora la hora).
const mismoDia = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Fecha "dd MMM yyyy" en español -> "19 Nov 2026".
const formatear = (d) => `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;

// Normaliza a medianoche para comparar contra min/max sin problemas de hora.
const aMedianoche = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/* --- Helpers de conversión para formularios que guardan 'yyyy-mm-dd' --- */
export const fechaAISO = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
export const isoAFecha = (s) => (s ? new Date(`${s}T00:00:00`) : null);

/* --- Íconos SVG inline (sin librería de íconos) --- */
const IconoCalendario = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const Chevron = ({ dir = 'down' }) => {
  const puntos = { down: '6 9 12 15 18 9', left: '15 18 9 12 15 6', right: '9 18 15 12 9 6' }[dir];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={puntos} />
    </svg>
  );
};

export default function DatePicker({
  value = null,
  onChange,
  placeholder = 'Elegir fecha',
  size = 'grande',
  label,
  min,
  max,
  disabled = false,
  className = '',
  centrado,
}) {
  const [abierto, setAbierto]   = useState(false);
  const [vista, setVista]       = useState('dias');              // 'dias' | 'meses' | 'anios'
  const [visible, setVisible]   = useState(value || new Date()); // mes/año que se está mostrando
  const [coords, setCoords]     = useState(null);                // posición fija del panel (portal)
  const triggerRef = useRef(null);
  const panelRef   = useRef(null);

  // El calendario se muestra centrado en pantalla (con fondo tenue) en vez de
  // pegado al botón. Se puede anclar al botón pasando `centrado={false}`.
  const panelCentrado = centrado ?? true;

  // Al abrir, posicionar la vista en la fecha seleccionada (o en el mes actual).
  useEffect(() => {
    if (abierto) {
      setVisible(value || new Date());
      setVista('dias');
    } else {
      setCoords(null);
    }
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Posiciona el panel (portal) respecto al trigger; se abre hacia arriba si no
  // cabe abajo. Se recalcula al hacer scroll, redimensionar o cambiar de vista.
  useLayoutEffect(() => {
    if (!abierto || panelCentrado) return; // centrado: no se posiciona respecto al botón
    const actualizar = () => {
      const t = triggerRef.current;
      const p = panelRef.current;
      if (!t) return;
      const r  = t.getBoundingClientRect();
      const ph = p?.offsetHeight || 360;
      const pw = p?.offsetWidth || 300;
      const gap = 10;
      const espacioAbajo = window.innerHeight - r.bottom;
      const arriba = espacioAbajo < ph + gap && r.top > espacioAbajo;
      let left = r.left;
      if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
      if (left < 8) left = 8;
      const top = arriba ? r.top - gap - ph : r.bottom + gap;
      setCoords({ top, left, arriba });
    };
    actualizar();
    window.addEventListener('scroll', actualizar, true);
    window.addEventListener('resize', actualizar);
    return () => {
      window.removeEventListener('scroll', actualizar, true);
      window.removeEventListener('resize', actualizar);
    };
  }, [abierto, vista]);

  // Cerrar al hacer clic fuera (trigger o panel) o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const alClicFuera = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const alEscape = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alEscape);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alEscape);
    };
  }, [abierto]);

  // Fecha de hoy (estable durante la vida del componente) para resaltar el
  // día/mes/año actual en el calendario, aunque todavía no se haya elegido nada.
  const hoy = useMemo(() => new Date(), []);

  const fueraDeRango = (d) => {
    const dm = aMedianoche(d);
    if (min && dm < aMedianoche(min)) return true;
    if (max && dm > aMedianoche(max)) return true;
    return false;
  };

  // Genera las 42 celdas (6 semanas) de la vista de días, empezando en domingo.
  const celdasDias = useMemo(() => {
    const anio = visible.getFullYear();
    const mes  = visible.getMonth();
    const primerDiaSemana = new Date(anio, mes, 1).getDay(); // 0 = domingo
    const inicio = new Date(anio, mes, 1 - primerDiaSemana);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      return { fecha: d, otroMes: d.getMonth() !== mes };
    });
  }, [visible]);

  const decadaInicio = Math.floor(visible.getFullYear() / 10) * 10;

  /* --- Navegación con las flechas (depende de la vista) --- */
  const navegar = (paso) => {
    setVisible((v) => {
      if (vista === 'dias')  return new Date(v.getFullYear(), v.getMonth() + paso, 1);
      if (vista === 'meses') return new Date(v.getFullYear() + paso, v.getMonth(), 1);
      return new Date(v.getFullYear() + paso * 10, v.getMonth(), 1); // años -> décadas
    });
  };

  const elegirDia = (d) => {
    if (fueraDeRango(d)) return;
    onChange?.(d);
    setAbierto(false);
  };

  const tituloCabecera =
    vista === 'dias'  ? `${MESES[visible.getMonth()]}, ${visible.getFullYear()}`
    : vista === 'meses' ? `${visible.getFullYear()}`
    : `${decadaInicio} - ${decadaInicio + 9}`;

  // Clic en el título: sube un nivel (días -> meses -> años).
  const subirNivel = () => setVista((v) => (v === 'dias' ? 'meses' : v === 'meses' ? 'anios' : v));

  const panel = (
    <div
      ref={panelRef}
      className={`dp-panel ${panelCentrado ? 'dp-panel--centrado' : coords?.arriba ? 'dp-panel--arriba' : ''}`}
      role="dialog"
      style={
        panelCentrado
          ? { top: '50%', left: '50%', visibility: 'visible' }
          : {
              top: coords?.top ?? -9999,
              left: coords?.left ?? -9999,
              visibility: coords ? 'visible' : 'hidden',
            }
      }
    >
      <div className="dp-cabecera">
        <button type="button" className="dp-nav" onClick={() => navegar(-1)} aria-label="Anterior"><Chevron dir="left" /></button>
        <button type="button" className="dp-titulo" onClick={subirNivel} disabled={vista === 'anios'}>
          {tituloCabecera}
        </button>
        <button type="button" className="dp-nav" onClick={() => navegar(1)} aria-label="Siguiente"><Chevron dir="right" /></button>
      </div>

      {/* ---- Vista DÍAS ---- */}
      {vista === 'dias' && (
        <div className="dp-dias">
          <div className="dp-semana">
            {DIAS_CORTOS.map((d) => <span key={d} className="dp-semana-dia">{d}</span>)}
          </div>
          <div className="dp-grid dp-grid--dias">
            {celdasDias.map(({ fecha, otroMes }, i) => {
              const deshab = fueraDeRango(fecha);
              return (
                <button
                  key={i}
                  type="button"
                  className={
                    'dp-celda' +
                    (otroMes ? ' dp-celda--otro' : '') +
                    (mismoDia(fecha, hoy) ? ' dp-celda--hoy' : '') +
                    (mismoDia(fecha, value) ? ' dp-celda--sel' : '') +
                    (deshab ? ' dp-celda--off' : '')
                  }
                  onClick={() => elegirDia(fecha)}
                  disabled={deshab}
                >
                  {fecha.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Vista MESES ---- */}
      {vista === 'meses' && (
        <div className="dp-grid dp-grid--meses">
          {MESES_CORTOS.map((m, i) => (
            <button
              key={m}
              type="button"
              className={
                'dp-celda' +
                (hoy.getFullYear() === visible.getFullYear() && hoy.getMonth() === i ? ' dp-celda--hoy' : '') +
                (value && value.getFullYear() === visible.getFullYear() && value.getMonth() === i ? ' dp-celda--sel' : '')
              }
              onClick={() => { setVisible(new Date(visible.getFullYear(), i, 1)); setVista('dias'); }}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* ---- Vista AÑOS ---- */}
      {vista === 'anios' && (
        <div className="dp-grid dp-grid--anios">
          {Array.from({ length: 12 }, (_, i) => decadaInicio - 1 + i).map((anio) => {
            const otraDecada = anio < decadaInicio || anio > decadaInicio + 9;
            return (
              <button
                key={anio}
                type="button"
                className={
                  'dp-celda' +
                  (otraDecada ? ' dp-celda--otro' : '') +
                  (hoy.getFullYear() === anio ? ' dp-celda--hoy' : '') +
                  (value && value.getFullYear() === anio ? ' dp-celda--sel' : '')
                }
                onClick={() => { setVisible(new Date(anio, visible.getMonth(), 1)); setVista('meses'); }}
              >
                {anio}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const control = (
    <button
      ref={triggerRef}
      type="button"
      className={`dp-trigger dp-trigger--${size} ${abierto ? 'dp-trigger--abierto' : ''}`}
      onClick={() => !disabled && setAbierto((o) => !o)}
      disabled={disabled}
    >
      <span className="dp-trigger-icono"><IconoCalendario /></span>
      <span className={`dp-trigger-texto ${value ? '' : 'dp-trigger-texto--placeholder'}`}>
        {value ? formatear(value) : placeholder}
      </span>
      <span className={`dp-trigger-flecha ${abierto ? 'dp-trigger-flecha--abierto' : ''}`}><Chevron /></span>
    </button>
  );

  return (
    <div className={`dp dp--${size} ${className}`.trim()}>
      {label ? (
        <span className="dp-grupo">
          <span className="dp-etiqueta">{label}</span>
          {control}
        </span>
      ) : control}

      {abierto && createPortal(
        panelCentrado
          ? (<><div className="dp-backdrop" onMouseDown={() => setAbierto(false)} />{panel}</>)
          : panel,
        document.body,
      )}
    </div>
  );
}
