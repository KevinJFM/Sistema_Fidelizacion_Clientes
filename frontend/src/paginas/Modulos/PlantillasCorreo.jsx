import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Skeleton from '../../componentes/Skeleton/Skeleton';
import { getPlantillas, actualizarPlantilla, previewPlantilla, enviarPruebaPlantilla } from '../../servicios/servicioPlantillas';
import './PlantillasCorreo.css';

// Tema actual del panel (para que la vista previa del correo cambie en claro/oscuro).
const temaActual = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

export default function PlantillasCorreo() {
  const [lista, setLista]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editando, setEditando] = useState(null); // plantilla en edición
  const [form, setForm]         = useState(null); // { activo, asunto, titulo, intro, cuerpo, boton }
  const [saving, setSaving]     = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview]   = useState({ asunto: '', html: '' });
  const [previewLoading, setPreviewLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      setLista(await getPlantillas());
    } catch {
      toast.error('Error al cargar los correos');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  // Interruptor on/off directo desde la lista (manda los textos actuales, que son obligatorios).
  const alternar = async (p) => {
    if (p.obligatorio) return;
    const nuevoActivo = p.activo ? 0 : 1;
    setLista((prev) => prev.map((x) => (x.clave === p.clave ? { ...x, activo: nuevoActivo } : x)));
    try {
      await actualizarPlantilla(p.clave, {
        activo: nuevoActivo, asunto: p.asunto, titulo: p.titulo,
        intro: p.intro, cuerpo: p.cuerpo, boton: p.boton,
      });
      toast.success(nuevoActivo ? 'Correo activado' : 'Correo desactivado');
    } catch {
      setLista((prev) => prev.map((x) => (x.clave === p.clave ? { ...x, activo: p.activo } : x)));
      toast.error('No se pudo cambiar el estado');
    }
  };

  const abrirEditor = (p) => {
    setEditando(p);
    setForm({
      activo: p.activo, asunto: p.asunto || '', titulo: p.titulo || '',
      intro: p.intro || '', cuerpo: p.cuerpo || '', boton: p.boton || '',
      dias: p.dias ?? '',
    });
    setPreview({ asunto: '', html: '' });
  };
  const cerrarEditor = () => { setEditando(null); setForm(null); };

  // Vista previa en vivo: se refresca (con debounce) cada vez que cambian los campos.
  const debounce = useRef(null);
  useEffect(() => {
    if (!editando || !form) return;
    setPreviewLoading(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        setPreview(await previewPlantilla(editando.clave, { ...form, tema: temaActual() }));
      } catch {
        /* la vista previa nunca rompe la edición */
      } finally {
        setPreviewLoading(false);
      }
    }, 450);
    return () => clearTimeout(debounce.current);
  }, [form, editando]);

  const guardar = async () => {
    setSaving(true);
    try {
      const actualizada = await actualizarPlantilla(editando.clave, form);
      setLista((prev) => prev.map((x) => (x.clave === actualizada.clave ? actualizada : x)));
      toast.success('Correo guardado');
      cerrarEditor();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const enviarPrueba = async () => {
    setEnviando(true);
    try {
      const { message } = await enviarPruebaPlantilla(editando.clave, form);
      toast.success(message || 'Prueba enviada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo enviar la prueba');
    } finally {
      setEnviando(false);
    }
  };

  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  // Último campo de texto enfocado (para insertar variables donde está el cursor).
  const campoActivo = useRef(null);
  const alEnfocar = (name) => (e) => { campoActivo.current = { name, el: e.target }; };

  // Inserta la variable en el cursor del campo activo (o al final del mensaje si no hay ninguno).
  const insertarVariable = (v) => {
    const campo = campoActivo.current;
    const name = campo?.name || 'cuerpo';
    const el = campo?.el;
    const actual = form?.[name] ?? '';
    if (el && typeof el.selectionStart === 'number') {
      const ini = el.selectionStart;
      const fin = el.selectionEnd;
      setCampo(name, actual.slice(0, ini) + v + actual.slice(fin));
      requestAnimationFrame(() => {
        el.focus();
        const pos = ini + v.length;
        try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
      });
    } else {
      setCampo(name, (actual ? `${actual} ` : '') + v);
    }
  };

  const variables = (editando?.variables || '').split(',').map((v) => v.trim()).filter(Boolean);

  // Separa las plantillas por destinatario: las del operador llevan la clave *_operador.
  const esOperador = (p) => String(p.clave || '').endsWith('_operador');
  const plantillasCliente = lista.filter((p) => !esOperador(p));
  const plantillasOperador = lista.filter(esOperador);

  // Una tarjeta con su título y su lista de correos (misma UI para cliente y operador).
  const renderSeccion = (titulo, descripcion, items) => (
    <div className="config-card">
      <div className="config-head">
        <div>
          <h3>{titulo}</h3>
          <p>{descripcion}</p>
        </div>
      </div>

      {loading ? (
        <div className="plantilla-list">
          {[1, 2, 3].map((i) => <Skeleton key={i} height={64} radius={14} />)}
        </div>
      ) : (
        <div className="plantilla-list">
          {items.map((p) => (
            <div key={p.clave} className={`plantilla-item ${!p.activo ? 'plantilla-off' : ''}`}>
              <div className="plantilla-item-info">
                <div className="plantilla-item-nombre">{p.nombre}</div>
                {p.descripcion && <div className="plantilla-item-desc">{p.descripcion}</div>}
              </div>
              <div className="plantilla-item-acciones">
                {p.obligatorio ? (
                  <span className="plantilla-badge-oblig" title="Este correo es esencial y no se puede desactivar">Siempre activo</span>
                ) : (
                  <button
                    type="button"
                    className={`switch ${p.activo ? 'switch-on' : ''}`}
                    onClick={() => alternar(p)}
                    aria-pressed={!!p.activo}
                    title={p.activo ? 'Correo activo' : 'Correo desactivado'}
                  >
                    <span className="switch-knob" />
                    <span className="switch-label">{p.activo ? 'Activo' : 'Inactivo'}</span>
                  </button>
                )}
                <button type="button" className="btn-ghost" onClick={() => abrirEditor(p)}>
                  Editar y ver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {renderSeccion(
        'Correos al cliente',
        'Activa o desactiva cada correo y edita su asunto y texto. El diseño (logo y colores) es fijo.',
        plantillasCliente,
      )}

      {(loading || plantillasOperador.length > 0) && renderSeccion(
        'Correos al operador',
        'Los que recibe el operador turístico al registrarlo y en cada visita o canje. No entra al portal, así que estos correos no llevan botón.',
        plantillasOperador,
      )}

      {/* Editor con vista previa en vivo */}
      {editando && form && (
        <div className="modal-overlay" onClick={cerrarEditor}>
          <div className="modal plantilla-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Correo · {editando.nombre}</h3>

            <div className="plantilla-editor">
              {/* Formulario */}
              <form className="modal-form plantilla-form" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
                {editando.descripcion && <p className="plantilla-desc">{editando.descripcion}</p>}
                {editando.obligatorio ? (
                  <span className="plantilla-badge-oblig" style={{ alignSelf: 'flex-start' }}>
                    Correo esencial · siempre activo
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`switch ${form.activo ? 'switch-on' : ''}`}
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => setCampo('activo', form.activo ? 0 : 1)}
                    aria-pressed={!!form.activo}
                  >
                    <span className="switch-knob" />
                    <span className="switch-label">{form.activo ? 'Activo' : 'Inactivo'}</span>
                  </button>
                )}

                <div className="form-field">
                  <label>Asunto</label>
                  <input value={form.asunto} onFocus={alEnfocar('asunto')} onChange={(e) => setCampo('asunto', e.target.value)} maxLength={160} />
                </div>
                <div className="form-field">
                  <label>Título</label>
                  <input value={form.titulo} onFocus={alEnfocar('titulo')} onChange={(e) => setCampo('titulo', e.target.value)} maxLength={160} />
                </div>
                <div className="form-field">
                  <label>Subtítulo <span className="optional">(opcional)</span></label>
                  <input value={form.intro} onFocus={alEnfocar('intro')} onChange={(e) => setCampo('intro', e.target.value)} maxLength={255} />
                </div>
                <div className="form-field">
                  <label>Mensaje <span className="optional">(opcional)</span></label>
                  <textarea value={form.cuerpo} onFocus={alEnfocar('cuerpo')} onChange={(e) => setCampo('cuerpo', e.target.value)} />
                </div>
                {editando.boton != null && (
                  <div className="form-field">
                    <label>Texto del botón <span className="optional">(opcional)</span></label>
                    <input value={form.boton} onFocus={alEnfocar('boton')} onChange={(e) => setCampo('boton', e.target.value)} maxLength={60} />
                  </div>
                )}

                {editando.dias != null && (
                  <div className="form-field">
                    <label>Días de antelación del aviso</label>
                    <input
                      type="number" min="1" max="60"
                      value={form.dias}
                      onChange={(e) => setCampo('dias', e.target.value)}
                    />
                    <span className="plantilla-var-hint" style={{ marginTop: 2 }}>
                      Con cuántos días de anticipación se avisa antes de que termine la promoción (usa la variable {'{dias}'}).
                    </span>
                  </div>
                )}

                {variables.length > 0 && (
                  <div>
                    <div className="plantilla-var-hint">Variables (clic para agregarlas donde está el cursor):</div>
                    <div className="plantilla-vars">
                      {variables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="plantilla-var-chip"
                          title={`Insertar ${v}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => insertarVariable(v)}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              {/* Vista previa */}
              <div className="plantilla-preview">
                <div className="plantilla-preview-label">Vista previa {previewLoading ? '· actualizando…' : '(con datos de ejemplo)'}</div>
                <div className="plantilla-preview-asunto"><strong>Asunto:</strong> {preview.asunto || '—'}</div>
                <iframe title="Vista previa del correo" srcDoc={preview.html || ''} />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={cerrarEditor}>Cancelar</button>
              <button type="button" className="btn-ghost" onClick={enviarPrueba} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviarme una prueba'}
              </button>
              <button type="button" className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
