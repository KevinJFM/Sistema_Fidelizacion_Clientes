import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getPosConfig, savePosConfig, setPosModo, probarPos, sincronizarPos, getPosEstado,
} from '../../servicios/servicioPos';
import '../Administracion/PaginasAdmin.css';
import './Usuarios.css';
import './Configuracion.css';
import './IntegracionPos.css';

const FORM_VACIO = { host: 'localhost', puerto: 3306, usuario: 'root', password: '', base_datos: 'eorderback' };

// Textos de las modales (icono: 'exito' | 'error' | 'info')
const MODAL_TEXTOS = {
  conectando: {
    titulo: 'Conectando…',
    mensaje: 'Estableciendo conexión con la base de datos del POS. Un momento…',
  },
  exito: {
    icono: 'exito',
    titulo: 'Conexión exitosa',
    mensaje: 'El sistema quedó conectado a la base de datos del POS. Los datos de conexión se bloquearon para evitar cambios accidentales.',
  },
  error: {
    icono: 'error',
    titulo: 'No se pudo conectar',
    mensaje: 'Revisa el host, el puerto, el usuario y la contraseña, e inténtalo de nuevo.',
  },
  desconectado: {
    icono: 'info',
    titulo: 'Conexión finalizada',
    mensaje: 'Te desconectaste del POS. Los campos quedaron habilitados para editar los datos de conexión.',
  },
  guardadoExito: {
    icono: 'exito',
    titulo: 'Guardado exitosamente',
    mensaje: 'Los datos de conexión se guardaron correctamente.',
  },
  yaGuardado: {
    icono: 'info',
    titulo: 'Sin cambios por guardar',
    mensaje: 'Estos datos de conexión ya están guardados. Modifica algún campo si deseas actualizarlos.',
  },
  errorGuardar: {
    icono: 'error',
    titulo: 'No se pudo guardar',
    mensaje: 'Ocurrió un error al guardar los datos de conexión. Inténtalo de nuevo.',
  },
  confirmarAuto: {
    icono: 'info',
    titulo: '¿Activar el modo automático?',
    mensaje: 'Cada pago registrado en el POS generará la transacción y otorgará los puntos automáticamente (se revisa cada 2 minutos). También puedes usar "Sincronizar ahora" cuando lo necesites.',
    confirmarTxt: 'Activar',
  },
  autoActivado: {
    icono: 'exito',
    titulo: 'Modo automático activado',
    mensaje: 'Los pagos del POS ahora se sincronizan automáticamente.',
  },
  confirmarManual: {
    icono: 'info',
    titulo: '¿Cambiar a modo manual?',
    mensaje: 'Se detendrá la sincronización automática con el POS y las transacciones se registrarán a mano, como hasta ahora.',
    confirmarTxt: 'Cambiar a manual',
  },
  manualActivado: {
    icono: 'info',
    titulo: 'Modo manual activado',
    mensaje: 'La sincronización automática quedó detenida.',
  },
  sincronizado: {
    icono: 'exito',
    titulo: 'Sincronización completada',
    mensaje: 'Se revisaron los pagos del POS.',
  },
  errorSincronizar: {
    icono: 'error',
    titulo: 'No se pudo sincronizar',
    mensaje: 'Revisa la conexión con el POS e inténtalo de nuevo.',
  },
  errorModo: {
    icono: 'error',
    titulo: 'No se pudo cambiar el modo',
    mensaje: 'Inténtalo de nuevo.',
  },
};

export default function IntegracionPos() {
  const [form, setForm] = useState(FORM_VACIO);
  const [tienePassword, setTienePassword] = useState(false);
  const [modo, setModo] = useState('manual');
  const [estado, setEstado] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [cfgGuardada, setCfgGuardada] = useState(null); // última config guardada (para detectar cambios)

  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [modal, setModal] = useState(null); // { tipo: 'conectando'|'exito'|'error'|'desconectado', detalle? }

  const cargar = async () => {
    try {
      const cfg = await getPosConfig();
      setForm({ host: cfg.host, puerto: cfg.puerto, usuario: cfg.usuario, password: '', base_datos: cfg.base_datos });
      setCfgGuardada({ host: cfg.host, puerto: Number(cfg.puerto), usuario: cfg.usuario, base_datos: cfg.base_datos });
      setTienePassword(cfg.tiene_password);
      setModo(cfg.modo);
      // Comprobación silenciosa: si la conexión guardada funciona, arranca como "Conectado"
      probarPos({}).then((r) => setConectado(!!r.ok)).catch(() => {});
    } catch {
      toast.error('No se pudo cargar la configuración del POS');
    }
    try { setEstado(await getPosEstado()); } catch { /* opcional */ }
  };

  useEffect(() => { cargar(); }, []);

  const handle = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  // Construye el payload; solo manda la contraseña si el usuario escribió una
  const payload = () => {
    const p = { host: form.host, puerto: Number(form.puerto), usuario: form.usuario, base_datos: form.base_datos };
    if (form.password) p.password = form.password;
    return p;
  };

  // Conectar: prueba la conexión y, si funciona, guarda los datos y bloquea los campos
  const handleConectar = async () => {
    setModal({ tipo: 'conectando' });
    try {
      const r = await probarPos(payload());
      if (r.ok) {
        try { await savePosConfig(payload()); } catch { /* la conexión igual funcionó */ }
        setCfgGuardada({ host: form.host, puerto: Number(form.puerto), usuario: form.usuario, base_datos: form.base_datos });
        setForm((p) => ({ ...p, password: '' }));
        setTienePassword(true);
        setConectado(true);
        setModal({ tipo: 'exito' });
      } else {
        setModal({ tipo: 'error', detalle: r.mensaje });
      }
    } catch {
      setModal({ tipo: 'error' });
    }
  };

  // Desconectar: habilita los campos de nuevo
  const handleDesconectar = () => {
    setConectado(false);
    setModal({ tipo: 'desconectado' });
  };

  const handleGuardar = async () => {
    // Verifica primero: si no hay ningún cambio, avisa en vez de guardar de nuevo
    const sinCambios = cfgGuardada
      && form.host === cfgGuardada.host
      && Number(form.puerto) === Number(cfgGuardada.puerto)
      && form.usuario === cfgGuardada.usuario
      && form.base_datos === cfgGuardada.base_datos
      && !form.password; // no escribió una contraseña nueva
    if (sinCambios) {
      setModal({ tipo: 'yaGuardado' });
      return;
    }

    setGuardando(true);
    try {
      await savePosConfig(payload());
      setCfgGuardada({ host: form.host, puerto: Number(form.puerto), usuario: form.usuario, base_datos: form.base_datos });
      if (form.password) setTienePassword(true);
      setForm((p) => ({ ...p, password: '' }));
      setModal({ tipo: 'guardadoExito' });
    } catch {
      setModal({ tipo: 'errorGuardar' });
    } finally {
      setGuardando(false);
    }
  };

  // Al tocar Automático/Manual: primero aparece la modal de confirmación
  const handleModo = (nuevo) => {
    if (nuevo === modo) return;
    setModal({
      tipo: nuevo === 'automatico' ? 'confirmarAuto' : 'confirmarManual',
      alConfirmar: () => confirmarCambioModo(nuevo),
    });
  };

  const confirmarCambioModo = async (nuevo) => {
    try {
      await setPosModo(nuevo);
      setModo(nuevo);
      setModal({ tipo: nuevo === 'automatico' ? 'autoActivado' : 'manualActivado' });
      getPosEstado().then(setEstado).catch(() => {});
    } catch {
      setModal({ tipo: 'errorModo' });
    }
  };

  // Sincronizar ahora: solo disponible en modo automático
  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await sincronizarPos();
      setModal({ tipo: 'sincronizado', mensaje: r.message });
      getPosEstado().then(setEstado).catch(() => {});
    } catch (err) {
      setModal({ tipo: 'errorSincronizar', mensaje: err.response?.data?.message });
    } finally {
      setSincronizando(false);
    }
  };

  const auto = modo === 'automatico';
  const textos = modal ? MODAL_TEXTOS[modal.tipo] : null;

  return (
    <div className="admin-page pos-page">
      <h2 className="page-title">Integración con el sistema de ventas (POS)</h2>
      <p className="page-subtitle">
        Conecta el sistema de fidelización con la base de datos del POS para otorgar puntos por los consumos.
      </p>

      {/* ===== Conexión ===== */}
      <div className="config-card">
        <div className="config-head">
          <div>
            <h3>Conexión a la base del POS</h3>
            <p>Datos de acceso a MySQL (los mismos que usas en MySQL Workbench).</p>
          </div>
          <span className={`pos-chip ${conectado ? 'on' : 'off'}`}>
            ● {conectado ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        <div className="config-grid">
          <div className="config-item">
            <label>Host / IP</label>
            <div className="config-input">
              <input type="text" value={form.host} disabled={conectado} onChange={(e) => handle('host', e.target.value)} placeholder="localhost" />
            </div>
          </div>
          <div className="config-item">
            <label>Puerto</label>
            <div className="config-input">
              <input type="number" value={form.puerto} disabled={conectado} onChange={(e) => handle('puerto', e.target.value)} placeholder="3306" />
            </div>
          </div>
          <div className="config-item">
            <label>Usuario</label>
            <div className="config-input">
              <input type="text" value={form.usuario} disabled={conectado} onChange={(e) => handle('usuario', e.target.value)} placeholder="root" />
            </div>
          </div>
          <div className="config-item">
            <label>Contraseña</label>
            <div className="config-input">
              <input
                type="password"
                value={form.password}
                disabled={conectado}
                onChange={(e) => handle('password', e.target.value)}
                placeholder={tienePassword ? '•••••• (guardada — escribe para cambiarla)' : 'Contraseña de MySQL'}
              />
            </div>
          </div>
          <div className="config-item">
            <label>Base de datos</label>
            <div className="config-input">
              <input type="text" value={form.base_datos} disabled={conectado} onChange={(e) => handle('base_datos', e.target.value)} placeholder="eorderback" />
            </div>
          </div>
        </div>

        <div className="config-actions" style={{ gap: 10 }}>
          <button type="button" className="btn-pos" onClick={conectado ? handleDesconectar : handleConectar}>
            {conectado ? 'Desconectar' : 'Conectar'}
          </button>
          <button type="button" className="btn-primary" onClick={handleGuardar} disabled={guardando || conectado}>
            {guardando ? 'Guardando…' : 'Guardar conexión'}
          </button>
        </div>
      </div>

      {/* ===== Modo ===== */}
      <div className="config-card">
        <div className="config-head">
          <div>
            <h3>Modo de las transacciones</h3>
            <p>
              <strong>Automático:</strong> cada pago en el POS genera la transacción y otorga los puntos solo; si el
              cliente trae DUI y no existe, se agrega al módulo de clientes.<br />
              <strong>Manual:</strong> el recepcionista registra las transacciones a mano, como hasta ahora (sin sincronización con el POS).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button
            type="button"
            className={auto ? 'btn-primary' : 'btn-pos'}
            onClick={() => handleModo('automatico')}
          >
            Automático
          </button>
          <button
            type="button"
            className={!auto ? 'btn-primary' : 'btn-pos'}
            onClick={() => handleModo('manual')}
          >
            Manual
          </button>
        </div>

        <div className="config-actions" style={{ marginTop: 18, alignItems: 'center', gap: 12 }}>
          {!auto && <span className="pos-nota-sync">Cambia a Automático para poder sincronizar.</span>}
          <button type="button" className="btn-pos" onClick={handleSincronizar} disabled={sincronizando || !auto}>
            {sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
        </div>
      </div>

      {/* ===== Estado ===== */}
      {estado && (
        <div className="config-card">
          <div className="config-head"><div><h3>Estado</h3></div></div>
          <div className="config-grid">
            <div className="config-item">
              <label>Modo actual</label>
              <div className="config-input"><input type="text" value={estado.modo === 'automatico' ? 'Automático' : 'Manual'} readOnly /></div>
            </div>
            <div className="config-item">
              <label>Transacciones creadas desde el POS</label>
              <div className="config-input"><input type="text" value={estado.transacciones_creadas} readOnly /></div>
            </div>
            <div className="config-item">
              <label>Pagos sin cliente identificado</label>
              <div className="config-input"><input type="text" value={estado.sin_cliente} readOnly /></div>
            </div>
            <div className="config-item">
              <label>Última sincronización</label>
              <div className="config-input">
                <input type="text" value={estado.ultima_sincronizacion ? new Date(estado.ultima_sincronizacion).toLocaleString('es-SV') : '—'} readOnly />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de conexión ===== */}
      {modal && (
        <div className="pos-modal-fondo">
          <div className="pos-modal">
            {modal.tipo === 'conectando' ? (
              <>
                <div className="pos-spinner" />
                <h3>{textos.titulo}</h3>
                <p>{textos.mensaje}</p>
              </>
            ) : (
              <>
                <div className={`pos-modal-icono ${textos.icono}`}>
                  {textos.icono === 'exito' ? '✓' : textos.icono === 'error' ? '✕' : 'i'}
                </div>
                <h3>{textos.titulo}</h3>
                <p>{modal.mensaje || textos.mensaje}</p>
                {modal.alConfirmar ? (
                  <div className="pos-modal-botones">
                    <button type="button" className="btn-pos" onClick={() => setModal(null)}>Cancelar</button>
                    <button type="button" className="btn-primary" onClick={modal.alConfirmar}>
                      {textos.confirmarTxt || 'Confirmar'}
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => setModal(null)}>OK</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
