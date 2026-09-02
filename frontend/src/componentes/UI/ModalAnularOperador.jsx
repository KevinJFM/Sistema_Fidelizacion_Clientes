import { useState } from 'react';
import toast from 'react-hot-toast';
import { anularTransaccionOperador } from '../../servicios/servicioOperadores';

const estiloTextarea = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  border: '2px solid #0D1BB8',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#111827',
  fontWeight: 600,
  outline: 'none',
  resize: 'vertical',
  minHeight: 78,
};

// Modal para ANULAR un registro de tour operador: revierte los puntos al operador y deja rastro.
// Exige un motivo (obligatorio). No borra el registro: queda marcado como anulado.
export default function ModalAnularOperador({ transaccion, onCerrar, onAnulada }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const t = transaccion;

  const anular = async () => {
    if (!motivo.trim()) {
      toast.error('Escribe el motivo de la anulación');
      return;
    }
    setSaving(true);
    try {
      const data = await anularTransaccionOperador(t.id_transaccion_op, motivo.trim());
      onAnulada?.(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo anular el registro');
      setSaving(false);
    }
  };

  const otorgados = Number(t.puntos_otorgados);
  const canjeados = Number(t.puntos_canjeados);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal modal-confirm" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon confirm-icon-warn">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="confirm-title">¿Anular registro #{t.id_transaccion_op}?</h3>
        <p className="confirm-text">
          <strong>{t.operador}</strong> · {t.num_personas} personas.
          <br />
          {otorgados > 0 && <>Se le quitarán <strong>{otorgados.toFixed(2)}</strong> puntos otorgados. </>}
          {canjeados > 0 && <>Se le devolverán <strong>{canjeados.toFixed(2)}</strong> puntos canjeados. </>}
          El registro quedará marcado como anulado y dejará de contar en los totales.
        </p>

        <div className="form-field" style={{ textAlign: 'left', marginBottom: 20 }}>
          <label>Motivo de la anulación</label>
          <textarea
            style={estiloTextarea}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={255}
            placeholder="Ej. número de personas equivocado, se registró dos veces, operador incorrecto..."
            autoFocus
          />
        </div>

        <div className="modal-actions confirm-actions">
          <button type="button" className="btn-ghost" onClick={onCerrar} disabled={saving}>Cancelar</button>
          <button type="button" className="btn-danger" onClick={anular} disabled={saving}>
            {saving ? 'Anulando...' : 'Sí, anular'}
          </button>
        </div>
      </div>
    </div>
  );
}
