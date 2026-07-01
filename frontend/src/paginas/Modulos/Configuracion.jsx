import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getConfiguracion, updateConfiguracion } from '../../servicios/servicioConfiguracion';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Configuracion.css';

// Metadatos de cada regla. `toggle` es la clave del interruptor ON/OFF (si aplica).
const GRUPOS = [
  {
    titulo: 'Puntos',
    descripcion: 'Cuántos puntos gana el cliente por su compra. Ej: por cada $10 de compra, 1 punto.',
    items: [
      { clave: 'puntos_monto_base', label: 'Por cada $ de compra', sufijo: '$'   },
      { clave: 'puntos_por_monto',  label: 'El cliente gana',      sufijo: 'pts' },
    ],
  },
  {
    titulo: 'Canje de puntos',
    descripcion: 'Permite cambiar puntos por un descuento',
    toggle: 'canje_activo',
    items: [
      { clave: 'puntos_para_canje', label: 'Puntos necesarios para canjear', sufijo: 'pts' },
      { clave: 'valor_canje',       label: 'Descuento al canjear puntos',    sufijo: '$'   },
    ],
  },
  {
    titulo: 'Bienvenida (primera compra)',
    descripcion: 'Beneficio que recibe el cliente en su primera transacción',
    toggle: 'bienvenida_activo',
    items: [
      { clave: 'bienvenida_puntos',    label: 'Puntos extra de bienvenida', sufijo: 'pts' },
      { clave: 'bienvenida_descuento', label: 'Descuento de bienvenida',    sufijo: '$'   },
    ],
  },
  {
    titulo: 'Descuento por compra alta',
    descripcion: 'Descuento automático cuando la compra supera cierto monto',
    toggle: 'descuento_monto_activo',
    items: [
      { clave: 'descuento_monto_minimo', label: 'Monto mínimo de compra', sufijo: '$' },
      { clave: 'descuento_monto_valor',  label: 'Descuento otorgado',     sufijo: '$' },
    ],
  },
];

// Claves que son interruptores (se guardan como '1'/'0', no se validan como números)
const CLAVES_TOGGLE = GRUPOS.map((g) => g.toggle).filter(Boolean);

export default function Configuracion() {
  const [valores, setValores] = useState({});
  const [otros, setOtros]     = useState([]); // claves no contempladas en GRUPOS
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getConfiguracion();
      const mapa = {};
      data.forEach((c) => { mapa[c.clave] = c.valor; });
      setValores(mapa);

      // Claves que no están en ningún grupo (por si se agregan nuevas)
      const conocidas = [
        ...GRUPOS.flatMap((g) => g.items.map((i) => i.clave)),
        ...CLAVES_TOGGLE,
      ];
      setOtros(data.filter((c) => !conocidas.includes(c.clave)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleChange = (clave, valor) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleToggle = (clave) => {
    setValores((prev) => ({ ...prev, [clave]: prev[clave] === '1' ? '0' : '1' }));
  };

  const activo = (grupo) => !grupo.toggle || valores[grupo.toggle] === '1';

  const handleGuardar = async (e) => {
    e.preventDefault();
    // Validar solo los valores numéricos (no los interruptores)
    for (const [clave, valor] of Object.entries(valores)) {
      if (CLAVES_TOGGLE.includes(clave)) continue;
      if (valor === '' || Number(valor) < 0) {
        toast.error('Los valores no pueden estar vacíos ni ser negativos');
        return;
      }
    }
    setSaving(true);
    try {
      await updateConfiguracion(valores);
      toast.success('Configuración guardada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Configuración</h2>
      <p className="page-subtitle">Ajusta las reglas del programa de fidelización. Aplican a las nuevas transacciones.</p>

      {loading ? (
        <div className="config-card"><p className="table-empty">Cargando...</p></div>
      ) : (
        <form onSubmit={handleGuardar}>
          {GRUPOS.map((grupo) => {
            const habilitado = activo(grupo);
            return (
              <div className={`config-card ${grupo.toggle && !habilitado ? 'config-card-off' : ''}`} key={grupo.titulo}>
                <div className="config-head">
                  <div>
                    <h3>{grupo.titulo}</h3>
                    <p>{grupo.descripcion}</p>
                  </div>
                  {grupo.toggle && (
                    <button
                      type="button"
                      className={`switch ${habilitado ? 'switch-on' : ''}`}
                      onClick={() => handleToggle(grupo.toggle)}
                      aria-pressed={habilitado}
                      title={habilitado ? 'Regla activa' : 'Regla desactivada'}
                    >
                      <span className="switch-knob" />
                      <span className="switch-label">{habilitado ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  )}
                </div>
                <div className="config-grid">
                  {grupo.items.map((item) => (
                    <div className="config-item" key={item.clave}>
                      <label>{item.label}</label>
                      <div className="config-input">
                        {item.sufijo === '$' && <span className="config-sufijo">$</span>}
                        <input
                          type="number"
                          min="0"
                          step={item.sufijo === '$' ? '0.01' : '1'}
                          value={valores[item.clave] ?? ''}
                          disabled={!habilitado}
                          onChange={(e) => handleChange(item.clave, e.target.value)}
                        />
                        {item.sufijo === 'pts' && <span className="config-sufijo">pts</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Otras claves que no están agrupadas */}
          {otros.length > 0 && (
            <div className="config-card">
              <div className="config-head"><div><h3>Otros</h3></div></div>
              <div className="config-grid">
                {otros.map((c) => (
                  <div className="config-item" key={c.clave}>
                    <label>{c.descripcion || c.clave}</label>
                    <div className="config-input">
                      <input
                        type="text"
                        value={valores[c.clave] ?? ''}
                        onChange={(e) => handleChange(c.clave, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="config-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
