import { useState } from 'react';
import toast from 'react-hot-toast';
import { buscarCliente } from '../../servicios/servicioClientes';
import { crearTransaccion } from '../../servicios/servicioTransacciones';
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
  canjear_puntos: false,
};

export default function Transacciones() {
  const [busqueda, setBusqueda] = useState({ id_tipo_documento: 1, numero_documento: '' });
  const [cliente, setCliente]   = useState(null);
  const [buscando, setBuscando] = useState(false);

  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [resultado, setResultado] = useState(null);

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
        canjear_puntos: form.canjear_puntos,
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

      <div className="trans-single">
        <div className="trans-card">
          {/* Buscar huésped */}
          <div className="form-row">
            <div className="form-field">
              <label>Tipo de documento</label>
              <select
                value={busqueda.id_tipo_documento}
                onChange={(e) => setBusqueda({ ...busqueda, id_tipo_documento: Number(e.target.value) })}
              >
                {TIPOS_DOCUMENTO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>N° de documento</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={busqueda.numero_documento}
                  onChange={(e) => setBusqueda({ ...busqueda, numero_documento: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
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

              <label className="check-row">
                <input type="checkbox" checked={form.canjear_puntos}
                  onChange={(e) => setForm({ ...form, canjear_puntos: e.target.checked })} />
                Canjear puntos en esta transacción
              </label>

              <button type="submit" className="btn-primary" disabled={saving}
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
                {saving ? 'Registrando...' : 'Registrar transacción'}
              </button>
            </form>
          )}

          {resultado && (
            <div className="resultado-card">
              <h4>✓ Transacción registrada</h4>
              {resultado.escenario && <p className="res-escenario">Escenario aplicado: <strong>{resultado.escenario}</strong></p>}
              <ul>
                <li><span>Puntos otorgados</span><strong>+{resultado.puntos_otorgados}</strong></li>
                {resultado.puntos_canjeados > 0 && <li><span>Puntos canjeados</span><strong>-{resultado.puntos_canjeados}</strong></li>}
                <li><span>Descuento aplicado</span><strong>${resultado.descuento_aplicado.toFixed(2)}</strong></li>
                <li className="res-total"><span>Total a pagar</span><strong>${resultado.total_a_pagar.toFixed(2)}</strong></li>
                <li><span>Saldo de puntos</span><strong>{resultado.saldo_puntos}</strong></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
