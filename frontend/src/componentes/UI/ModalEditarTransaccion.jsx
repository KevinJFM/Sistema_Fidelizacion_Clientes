import { useState } from 'react';
import toast from 'react-hot-toast';
import DatePicker, { isoAFecha, fechaAISO } from './DatePicker';
import { editarTransaccion } from '../../servicios/servicioTransacciones';

// Normaliza una fecha a 'yyyy-mm-dd'. Acepta lo que ya viene así (del formulario de registro) o un
// Date/ISO del backend. El caso 'yyyy-mm-dd' se devuelve tal cual para no correr el día por zona horaria.
const aISO = (v) => {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : fechaAISO(d);
};

// Modal para corregir SOLO los datos seguros de una transacción: folio/referencia y fechas de
// hospedaje. A propósito no deja tocar monto ni puntos (para eso se anula y se registra de nuevo).
export default function ModalEditarTransaccion({ transaccion, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    referencia_venta: transaccion.referencia_venta || '',
    fecha_ingreso: aISO(transaccion.fecha_ingreso),
    fecha_salida: aISO(transaccion.fecha_salida),
  });
  const [saving, setSaving] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const datos = {
        referencia_venta: form.referencia_venta.trim() || null,
        fecha_ingreso: form.fecha_ingreso || null,
        fecha_salida: form.fecha_salida || null,
      };
      await editarTransaccion(transaccion.id_transaccion, datos);
      onGuardado?.(datos);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar los cambios');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Editar transacción #{transaccion.id_transaccion}</h3>
        <p className="confirm-text" style={{ textAlign: 'left', marginBottom: 16 }}>
          Solo puedes corregir el <strong>folio</strong> y las <strong>fechas de hospedaje</strong>.
          Para cambiar el monto o los puntos, anula la transacción y regístrala de nuevo.
        </p>

        <form className="modal-form" onSubmit={guardar}>
          <div className="form-field">
            <label>N° de folio / referencia <span className="optional">(opcional)</span></label>
            <input
              value={form.referencia_venta}
              onChange={(e) => setForm({ ...form, referencia_venta: e.target.value })}
            />
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

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
