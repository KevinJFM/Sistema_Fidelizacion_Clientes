import { useState } from 'react';
import toast from 'react-hot-toast';
import { anularTransaccion } from '../../servicios/servicioTransacciones';

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

// Modal de confirmación para ANULAR una transacción: revierte los puntos al cliente y deja rastro.
// Exige un motivo (obligatorio). No borra la transacción: queda marcada como anulada.
export default function ModalAnularTransaccion({ transaccion, onCerrar, onAnulada }) {
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
      const data = await anularTransaccion(t.id_transaccion, motivo.trim());
      onAnulada?.(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo anular la transacción');
      setSaving(false);
    }
  };

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
        <h3 className="confirm-title">¿Anular transacción #{t.id_transaccion}?</h3>
        <p className="confirm-text">
          <strong>{t.nombres} {t.apellidos}</strong> · consumo de <strong>${Number(t.monto).toFixed(2)}</strong>.
          <br />
          {t.puntos_otorgados > 0 && <>Se le quitarán <strong>{t.puntos_otorgados}</strong> puntos otorgados. </>}
          {t.puntos_canjeados > 0 && <>Se le devolverán <strong>{t.puntos_canjeados}</strong> puntos canjeados. </>}
          La transacción quedará marcada como anulada y dejará de contar en los totales.
        </p>

        <div className="form-field" style={{ textAlign: 'left', marginBottom: 20 }}>
          <label>Motivo de la anulación</label>
          <textarea
            style={estiloTextarea}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={255}
            placeholder="Ej. monto equivocado, se registró dos veces, cliente incorrecto..."
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
