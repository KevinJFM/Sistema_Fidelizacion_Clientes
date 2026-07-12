import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { buscarCliente } from '../../servicios/servicioClientes';
import { crearTransaccion, getRecompensas } from '../../servicios/servicioTransacciones';
import { formatDui, formatPasaporte } from '../../utilidades/formato';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Transacciones.css';

const TIPOS_DOCUMENTO = [
  { id: 1, label: 'DUI' },
  { id: 2, label: 'Pasaporte' },
];

const emptyForm = {
  monto: '',
  fecha_ingreso: '',
  fecha_salida: '',
  referencia_venta: '',
  id_recompensa: '',
};

export default function Transacciones() {
  const [busqueda, setBusqueda] = useState({ id_tipo_documento: 1, numero_documento: '' });
  const [cliente, setCliente]   = useState(null);
  const [buscando, setBuscando] = useState(false);

  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [resultado, setResultado] = useState(null);
  const [recompensas, setRecompensas] = useState([]);

  useEffect(() => {
    getRecompensas().then(setRecompensas).catch(() => {});
  }, []);

  const handleBuscar = async () => {
    if (!busqueda.numero_documento.trim()) {
      toast.error('Ingresa un número de documento');
      return;
    }
    setBuscando(true);
    setCliente(null);
    setResultado(null);
    try {
      const c = await buscarCliente(busqueda.id_tipo_documento, busqueda.numero_documento.trim());
      if (c.id_estado !== 1) toast.error('El cliente no está activo');
      setCliente(c);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cliente no encontrado');
    } finally {
      setBuscando(false);
    }
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    if (!cliente) return;
    const monto = Number(form.monto);
    if (!monto || monto <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setSaving(true);
    try {
      const res = await crearTransaccion({
        id_cliente: cliente.id_cliente,
        monto,
        referencia_venta: form.referencia_venta || null,
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_salida: form.fecha_salida || null,
        id_recompensa: form.id_recompensa || null,
      });
      setResultado(res);
      toast.success('Transacción registrada');
      setCliente({ ...cliente, puntos_acumulados: res.saldo_puntos });
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Registrar transacción</h2>
      <p className="page-subtitle">Busca al huésped, registra su consumo y otorga puntos automáticamente</p>

      <div className="trans-grid">
        <div className="trans-card">
          {/* Buscar huésped */}
          <div className="form-row" style={{ gridTemplateColumns: '160px 1fr' }}>
            <div className="form-field">
              <label>Tipo de documento</label>
              <select
                value={busqueda.id_tipo_documento}
                onChange={(e) => setBusqueda({ id_tipo_documento: Number(e.target.value), numero_documento: '' })}
              >
                {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>N° de documento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={busqueda.numero_documento}
                  onChange={(e) => setBusqueda({
                    ...busqueda,
                    numero_documento: busqueda.id_tipo_documento === 1 ? formatDui(e.target.value) : formatPasaporte(e.target.value),
                  })}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                  placeholder={busqueda.id_tipo_documento === 1 ? '12345678-9' : 'N° de pasaporte'}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-primary" onClick={handleBuscar} disabled={buscando}>
                  {buscando ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {cliente && (
            <div className="cliente-card">
              <div>
                <span className="cliente-nombre">{cliente.nombres} {cliente.apellidos}</span>
                <span className="cliente-doc">{cliente.tipo_documento}: {cliente.numero_documento}</span>
              </div>
              <div className="cliente-puntos">
                <span>{cliente.puntos_acumulados}</span>
                <small>puntos</small>
              </div>
            </div>
          )}

          {cliente && (
            <form className="modal-form" onSubmit={handleRegistrar} style={{ marginTop: 18 }}>
              <div className="form-field">
                <label>Monto del consumo ($)</label>
                <input type="number" step="0.01" min="0" value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })} />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Fecha de ingreso</label>
                  <input type="date" value={form.fecha_ingreso}
                    onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Fecha de salida</label>
                  <input type="date" value={form.fecha_salida}
                    onChange={(e) => setForm({ ...form, fecha_salida: e.target.value })} />
                </div>
              </div>

              <div className="form-field">
                <label>N° de folio / referencia <span className="optional">(opcional)</span></label>
                <input value={form.referencia_venta}
                  onChange={(e) => setForm({ ...form, referencia_venta: e.target.value })} />
              </div>

              <div className="form-field">
                <label>Canjear puntos por... <span className="optional">(opcional)</span></label>
                <select value={form.id_recompensa}
                  onChange={(e) => setForm({ ...form, id_recompensa: e.target.value })}>
                  <option value="">No canjear</option>
                  {recompensas.map((r) => {
                    const alcanza = cliente && cliente.puntos_acumulados >= r.puntos;
                    return (
                      <option key={r.id} value={r.id} disabled={!alcanza}>
                        {r.nombre} — {r.puntos} pts (${Number(r.valor).toFixed(2)}){alcanza ? '' : ' · faltan puntos'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button type="submit" className="btn-primary" disabled={saving}
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
                {saving ? 'Registrando...' : 'Registrar transacción'}
              </button>
            </form>
          )}
        </div>

        {/* Columna derecha: resultado de la transacción */}
        <div className="trans-card">
          <h3 className="trans-card-title">Resultado</h3>
          {resultado ? (
            <div className="resultado-card">
              <h4>✓ Transacción registrada</h4>
              {resultado.promociones_aplicadas?.length > 0 && (
                <div className="res-promociones">
                  <span className="res-promociones-titulo">Promociones aplicadas:</span>
                  <div className="res-chips">
                    {resultado.promociones_aplicadas.map((p) => (
                      <span key={p} className="res-chip">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              <ul>
                <li><span>Puntos base</span><strong>+{resultado.puntos_base}</strong></li>
                {resultado.puntos_extra_bienvenida > 0 && (
                  <li className="res-extra"><span>+ Extra bienvenida</span><strong>+{resultado.puntos_extra_bienvenida}</strong></li>
                )}
                {resultado.puntos_extra_promocion > 0 && (
                  <li className="res-extra"><span>+ Extra por promoción</span><strong>+{resultado.puntos_extra_promocion}</strong></li>
                )}
                {(resultado.puntos_extra_bienvenida > 0 || resultado.puntos_extra_promocion > 0) && (
                  <li className="res-subtotal"><span>Total puntos otorgados</span><strong>+{resultado.puntos_otorgados}</strong></li>
                )}
                {resultado.puntos_canjeados > 0 && (
                  <li><span>Puntos canjeados</span><strong>-{resultado.puntos_canjeados}</strong></li>
                )}
                <li>
                  <span>
                    Descuento aplicado
                    {resultado.porcentaje_descuento_promo != null && (
                      <em className="res-porcentaje"> ({resultado.porcentaje_descuento_promo}%)</em>
                    )}
                  </span>
                  <strong>${resultado.descuento_aplicado.toFixed(2)}</strong>
                </li>
                <li className="res-total"><span>Total a pagar</span><strong>${resultado.total_a_pagar.toFixed(2)}</strong></li>
                <li><span>Saldo de puntos</span><strong>{resultado.saldo_puntos}</strong></li>
              </ul>
            </div>
          ) : (
            <p className="res-vacio">
              Registra una transacción para ver aquí los puntos otorgados, el descuento y el total a pagar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
