import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { buscarCliente } from '../../servicios/servicioClientes';
import { crearTransaccion, getRecompensas, getPromocionesAplicables } from '../../servicios/servicioTransacciones';
import { formatDui, formatPasaporte } from '../../utilidades/formato';
import DatePicker, { isoAFecha, fechaAISO } from '../../componentes/UI/DatePicker';
import ModalEditarTransaccion from '../../componentes/UI/ModalEditarTransaccion';
import ModalAnularTransaccion from '../../componentes/UI/ModalAnularTransaccion';
import ModalExito from '../../componentes/UI/ModalExito';
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
  promocion: '', // '' = ninguna, 'bienvenida', o el id de una promoción vigente hoy
};

export default function Transacciones() {
  const [busqueda, setBusqueda] = useState({ id_tipo_documento: 1, numero_documento: '' });
  const [cliente, setCliente]   = useState(null);
  const [buscando, setBuscando] = useState(false);

  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [resultado, setResultado] = useState(null);
  const [recompensas, setRecompensas] = useState([]);
  const [promoInfo, setPromoInfo] = useState(null); // { bienvenida_aplica, bienvenida, promociones }
  const [modalOpen, setModalOpen] = useState(false);

  // Datos de la transacción recién registrada, para poder editarla o anularla sin salir de la pantalla.
  const [ultima, setUltima] = useState(null);
  const [editando, setEditando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [exito, setExito] = useState('');

  useEffect(() => {
    getRecompensas().then(setRecompensas).catch(() => {});
  }, []);

  // Al terminar de guardar, el check de éxito se muestra un momento y el modal se cierra solo.
  useEffect(() => {
    if (modalOpen && !saving) {
      const id = setTimeout(() => setModalOpen(false), 1400);
      return () => clearTimeout(id);
    }
  }, [modalOpen, saving]);

  const handleBuscar = async () => {
    if (!busqueda.numero_documento.trim()) {
      toast.error('Ingresa un número de documento');
      return;
    }
    setBuscando(true);
    setCliente(null);
    setResultado(null);
    setUltima(null);
    setPromoInfo(null);
    setForm(emptyForm);
    try {
      const c = await buscarCliente(busqueda.id_tipo_documento, busqueda.numero_documento.trim());
      if (c.id_estado !== 1) toast.error('El cliente no está activo');
      setCliente(c);
      // Trae lo que el cajero puede elegir para este cliente (bienvenida + promos vigentes hoy).
      // Si es su primera compra, deja la Bienvenida PRE-SELECCIONADA (para no perderla por descuido).
      getPromocionesAplicables(c.id_cliente).then((info) => {
        setPromoInfo(info);
        if (info?.bienvenida_aplica) setForm((f) => ({ ...f, promocion: 'bienvenida' }));
      }).catch(() => setPromoInfo(null));
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
    setModalOpen(true);
    try {
      const res = await crearTransaccion({
        id_cliente: cliente.id_cliente,
        monto,
        referencia_venta: form.referencia_venta || null,
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_salida: form.fecha_salida || null,
        id_recompensa: form.id_recompensa || null,
        // En un canje no se aplican promociones; se manda vacío para evitar confusión.
        promocion: form.id_recompensa ? '' : (form.promocion || ''),
      });
      setResultado(res);
      setCliente({ ...cliente, puntos_acumulados: res.saldo_puntos });
      // Guardamos lo necesario para editar/anular esta transacción desde el resultado.
      setUltima({
        id_transaccion: res.id_transaccion,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        monto,
        referencia_venta: form.referencia_venta || '',
        fecha_ingreso: form.fecha_ingreso || '',
        fecha_salida: form.fecha_salida || '',
        puntos_otorgados: res.puntos_otorgados,
        puntos_canjeados: res.puntos_canjeados,
      });
      setForm(emptyForm);
    } catch (err) {
      setModalOpen(false);
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const cerrarModal = () => {
    if (saving) return; // no permitir cerrar mientras carga
    setModalOpen(false);
  };

  return (
    <div className="admin-page">
      <h2 className="page-title">Registrar transacción</h2>
      <p className="page-subtitle">Busca al huésped, registra su consumo y otorga puntos automáticamente</p>

      <div className="trans-grid">
        <div className="trans-card">
          {/* Buscar huésped */}
          <div className="form-row busqueda-row">
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
                  <DatePicker
                    size="compacto"
                    className="dp--bloque"
                    value={isoAFecha(form.fecha_ingreso)}
                    onChange={(d) => setForm({ ...form, fecha_ingreso: fechaAISO(d) })}
                    placeholder="Elegir fecha"
                  />
                </div>
                <div className="form-field">
                  <label>Fecha de salida</label>
                  <DatePicker
                    size="compacto"
                    className="dp--bloque"
                    value={isoAFecha(form.fecha_salida)}
                    onChange={(d) => setForm({ ...form, fecha_salida: fechaAISO(d) })}
                    placeholder="Elegir fecha"
                  />
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

              <div className="form-field">
                <label>Promoción a aplicar <span className="optional">(opcional)</span></label>
                <select
                  value={form.promocion}
                  disabled={!!form.id_recompensa}
                  onChange={(e) => setForm({ ...form, promocion: e.target.value })}
                >
                  <option value="">Ninguna</option>
                  {promoInfo?.bienvenida_aplica && (
                    <option value="bienvenida">
                      Bienvenida (primera compra) · +{promoInfo.bienvenida.puntos} pts
                      {promoInfo.bienvenida.descuento > 0 ? ` y $${Number(promoInfo.bienvenida.descuento).toFixed(2)} desc.` : ''}
                    </option>
                  )}
                  {promoInfo?.promociones?.map((p) => {
                    const extras = [];
                    if (p.puntos_extra > 0) extras.push(`+${p.puntos_extra} pts`);
                    if (p.descuento_extra > 0) extras.push(`${p.descuento_extra}% desc.`);
                    return (
                      <option key={p.id_escenario} value={p.id_escenario}>
                        {p.nombre}{extras.length ? ` · ${extras.join(' y ')}` : ''}
                      </option>
                    );
                  })}
                </select>
                {form.id_recompensa ? (
                  <span className="optional" style={{ marginTop: 4, fontWeight: 700, color: '#6b7280', fontSize: 12 }}>En un canje no se aplican promociones.</span>
                ) : (
                  promoInfo && !promoInfo.bienvenida_aplica && promoInfo.promociones?.length === 0 && (
                    <span className="optional" style={{ marginTop: 4, fontWeight: 700, color: '#6b7280', fontSize: 12 }}>No hay promociones vigentes hoy para este cliente.</span>
                  )
                )}
                {/* Primera compra + eligió una promoción (no la bienvenida): avisa que se pierde la bienvenida. */}
                {promoInfo?.bienvenida_aplica && !form.id_recompensa
                  && form.promocion && form.promocion !== 'bienvenida' && (
                  <span style={{ marginTop: 4, fontWeight: 700, color: '#b45309', fontSize: 12 }}>
                    ⚠️ Es la primera compra: al elegir esta promoción, el cliente no recibirá el beneficio de bienvenida.
                  </span>
                )}
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

              {/* ¿Te equivocaste? Corrige folio/fechas o anula esta transacción sin salir de aquí. */}
              {ultima && (
                <div className="resultado-acciones">
                  <button type="button" className="btn-ghost" onClick={() => setEditando(true)}>
                    Editar folio/fechas
                  </button>
                  <button type="button" className="btn-danger" onClick={() => setAnulando(true)}>
                    Anular
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="res-vacio">
              Registra una transacción para ver aquí los puntos otorgados, el descuento y el total a pagar.
            </p>
          )}
        </div>
      </div>

      {/* Modal de progreso / confirmación */}
      {modalOpen && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="trans-modal" onClick={(e) => e.stopPropagation()}>
            {saving ? (
              <>
                <div className="trans-modal-spinner" />
                <h3 className="trans-modal-titulo">Registrando transacción...</h3>
                <p className="trans-modal-texto">Un momento, por favor.</p>
              </>
            ) : (
              <>
                <div className="trans-modal-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="trans-modal-titulo">¡Transacción realizada!</h3>
              </>
            )}
          </div>
        </div>
      )}

      {/* Corregir folio/fechas de la transacción recién registrada */}
      {editando && ultima && (
        <ModalEditarTransaccion
          transaccion={ultima}
          onCerrar={() => setEditando(false)}
          onGuardado={(datos) => {
            setEditando(false);
            setUltima((u) => ({
              ...u,
              referencia_venta: datos.referencia_venta || '',
              fecha_ingreso: datos.fecha_ingreso || '',
              fecha_salida: datos.fecha_salida || '',
            }));
            setExito('Cambios guardados');
          }}
        />
      )}

      {/* Anular la transacción recién registrada (revierte los puntos) */}
      {anulando && ultima && (
        <ModalAnularTransaccion
          transaccion={ultima}
          onCerrar={() => setAnulando(false)}
          onAnulada={(data) => {
            setAnulando(false);
            setResultado(null);
            setUltima(null);
            if (data?.saldo_puntos != null && cliente) {
              setCliente({ ...cliente, puntos_acumulados: data.saldo_puntos });
            }
            setExito('Transacción anulada');
          }}
        />
      )}

      {exito && <ModalExito mensaje={exito} onCerrar={() => setExito('')} />}
    </div>
  );
}
