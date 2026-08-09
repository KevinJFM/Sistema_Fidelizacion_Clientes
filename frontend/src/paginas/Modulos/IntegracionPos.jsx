import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getPosPerfiles, setPosPerfil, savePosConfig, setPosModo, probarPos, sincronizarPos, getPosEstado,
} from '../../servicios/servicioPos';
import { SkeletonConfig } from '../../componentes/Skeleton/Skeleton';
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
    mensaje: 'La conexión funcionó y este perfil quedó activo. Los campos se bloquearon para evitar cambios accidentales; toca "Desconectar" para editarlos.',
  },
  error: {
    icono: 'error',
    titulo: 'No se pudo conectar',
    mensaje: 'Revisa el host, el puerto, el usuario y la contraseña, e inténtalo de nuevo.',
  },
  desconectado: {
    icono: 'info',
    titulo: 'Conexión finalizada',
    mensaje: 'Te desconectaste. Los campos quedaron habilitados para editar los datos de conexión.',
  },
  perfilActivado: {
    icono: 'exito',
    titulo: 'Perfil activado',
    mensaje: 'Este perfil quedó como activo. La sincronización usará su base de datos.',
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
  enCurso: {
    icono: 'info',
    titulo: 'Sincronización en curso',
    mensaje: 'El sistema ya está sincronizando en este momento (lo hace solo cada 2 minutos). Espera unos segundos y los nuevos clientes aparecerán. No necesitas volver a presionar.',
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

const COOLDOWN_SEG = 60;                        // segundos que el botón queda bloqueado tras sincronizar
const COOLDOWN_KEY = 'posSyncCooldownHasta';    // guarda el fin del cooldown (sobrevive a recargas)

export default function IntegracionPos() {
  const [form, setForm] = useState(FORM_VACIO);
  const [tienePassword, setTienePassword] = useState(false);
  const [modo, setModo] = useState('manual');           // modo del perfil ACTIVO (auto/manual)
  const [estado, setEstado] = useState(null);
  const [conectado, setConectado] = useState(false);    // ¿conecta el perfil que estás viendo?
  const [perfiles, setPerfiles] = useState({});         // { local: {...}, web: {...} } sin contraseña
  const [perfilSel, setPerfilSel] = useState('local');  // perfil que estás viendo/editando
  const [perfilActivo, setPerfilActivo] = useState('local'); // perfil que usa la sincronización

  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [cargandoPagina, setCargandoPagina] = useState(true); // primera carga: mostrar skeleton
  const [esperaSync, setEsperaSync] = useState(0); // segundos de bloqueo tras sincronizar (anti-spam)
  const [modal, setModal] = useState(null); // { tipo, detalle? }

  // Vuelca la config de un perfil en el formulario (sin la contraseña)
  const volcarPerfilEnForm = (cfg) => {
    setForm({ host: cfg.host, puerto: cfg.puerto, usuario: cfg.usuario, password: '', base_datos: cfg.base_datos });
    setTienePassword(!!cfg.tiene_password);
  };

  const cargar = async () => {
    try {
      const { perfiles: lista, activo } = await getPosPerfiles();
      const mapa = Object.fromEntries(lista.map((p) => [p.perfil, p]));
      setPerfiles(mapa);
      setPerfilActivo(activo);
      setPerfilSel(activo);
      volcarPerfilEnForm(mapa[activo] || FORM_VACIO);
      setModo(mapa[activo]?.modo || 'manual');
      // Comprobación silenciosa: ¿el perfil activo conecta?
      probarPos({ perfil: activo }).then((r) => setConectado(!!r.ok)).catch(() => {});
    } catch {
      toast.error('No se pudo cargar la configuración del POS');
    }
    try { setEstado(await getPosEstado()); } catch { /* opcional */ }
    setCargandoPagina(false);
  };

  useEffect(() => { cargar(); }, []);

  // Al cargar, restaura la espera si el cooldown aún no vence (sobrevive a recargas)
  useEffect(() => {
    const hasta = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    const restante = Math.ceil((hasta - Date.now()) / 1000);
    if (restante > 0) setEsperaSync(restante);
  }, []);

  // Cuenta regresiva del bloqueo del botón "Sincronizar" (anti-spam)
  useEffect(() => {
    if (esperaSync <= 0) return;
    const t = setTimeout(() => setEsperaSync((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [esperaSync]);

  // Auto-refresco del panel de Estado en modo automático: refleja (cada 30 s, sin
  // recargar) los clientes y transacciones que va trayendo la sincronización.
  useEffect(() => {
    if (modo !== 'automatico') return;
    const t = setInterval(() => {
      getPosEstado().then(setEstado).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [modo]);

  const handle = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

  // Construye el payload del perfil que estás viendo; solo manda la contraseña si escribiste una
  const payload = () => {
    const p = { perfil: perfilSel, host: form.host, puerto: Number(form.puerto), usuario: form.usuario, base_datos: form.base_datos };
    if (form.password) p.password = form.password;
    return p;
  };

  // Guarda en memoria (cache local) los datos del perfil recién editado
  const refrescarCachePerfil = () => {
    setPerfiles((prev) => ({
      ...prev,
      [perfilSel]: {
        ...prev[perfilSel],
        perfil: perfilSel,
        host: form.host, puerto: Number(form.puerto), usuario: form.usuario, base_datos: form.base_datos,
        tiene_password: (prev[perfilSel]?.tiene_password) || !!form.password,
      },
    }));
    if (form.password) setTienePassword(true);
  };

  // Cambiar de pestaña (Local/Web): carga ese perfil en el formulario y prueba si conecta
  const seleccionarPerfil = (p) => {
    if (p === perfilSel) return;
    setPerfilSel(p);
    volcarPerfilEnForm(perfiles[p] || FORM_VACIO);
    setConectado(false);
    probarPos({ perfil: p }).then((r) => setConectado(!!r.ok)).catch(() => setConectado(false));
  };

  // Probar y activar: prueba el perfil visible; si funciona, lo guarda y lo deja como activo
  const handleConectar = async () => {
    setModal({ tipo: 'conectando' });
    try {
      const r = await probarPos(payload());
      if (!r.ok) { setModal({ tipo: 'error', detalle: r.mensaje }); return; }
      try { await savePosConfig(payload()); } catch { /* la conexión igual funcionó */ }
      refrescarCachePerfil();
      try {
        const act = await setPosPerfil(perfilSel);
        setPerfilActivo(perfilSel);
        if (act?.modo) setModo(act.modo);
      } catch { /* la conexión funcionó; el activar se puede reintentar */ }
      setForm((p) => ({ ...p, password: '' }));
      setConectado(true);
      setModal({ tipo: 'exito' });
    } catch {
      setModal({ tipo: 'error' });
    }
  };

  // Desconectar: habilita los campos de nuevo para editarlos (no cambia el perfil activo)
  const handleDesconectar = () => {
    setConectado(false);
    setModal({ tipo: 'desconectado' });
  };

  // Activar sin editar: deja el perfil visible como el que usa la sincronización
  const handleActivar = async () => {
    try {
      const act = await setPosPerfil(perfilSel);
      setPerfilActivo(perfilSel);
      if (act?.modo) setModo(act.modo);
      setModal({ tipo: 'perfilActivado' });
    } catch {
      setModal({ tipo: 'errorGuardar' });
    }
  };

  // Guardar el perfil visible SIN activarlo
  const handleGuardar = async () => {
    const base = perfiles[perfilSel] || {};
    const sinCambios = form.host === base.host
      && Number(form.puerto) === Number(base.puerto)
      && form.usuario === base.usuario
      && form.base_datos === base.base_datos
      && !form.password; // no escribió una contraseña nueva
    if (sinCambios) {
      setModal({ tipo: 'yaGuardado' });
      return;
    }

    setGuardando(true);
    try {
      await savePosConfig(payload());
      refrescarCachePerfil();
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
      if (r.enCurso) {
        // El automático (o un clic previo) ya está corriendo: no se lanzó otra.
        setModal({ tipo: 'enCurso' });
      } else {
        setModal({ tipo: 'sincronizado', mensaje: r.message });
        getPosEstado().then(setEstado).catch(() => {});
      }
      // bloquea el botón: el sistema ya sincroniza solo cada 2 min. Se guarda el fin
      // del cooldown para que la espera sobreviva si recargan la página.
      localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_SEG * 1000));
      setEsperaSync(COOLDOWN_SEG);
    } catch (err) {
      setModal({ tipo: 'errorSincronizar', mensaje: err.response?.data?.message });
    } finally {
      setSincronizando(false);
    }
  };

  const auto = modo === 'automatico';
  const textos = modal ? MODAL_TEXTOS[modal.tipo] : null;

  if (cargandoPagina) return <SkeletonConfig tarjetas={3} filasPorTarjeta={4} />;

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

        {/* Selector de perfil: Local (POS en esta PC) o Web (POS en el hosting/remoto) */}
        <div className="pos-perfiles">
          {['local', 'web'].map((p) => (
            <button
              key={p}
              type="button"
              className={`pos-perfil-btn ${perfilSel === p ? 'sel' : ''}`}
              onClick={() => seleccionarPerfil(p)}
            >
              {p === 'local' ? 'Local' : 'Web'}
              {perfilActivo === p && <span className="pos-perfil-activo">● Activo</span>}
            </button>
          ))}
        </div>
        <p className="pos-perfil-ayuda">
          <strong>Local:</strong> el POS en esta computadora (localhost).<br />
          <strong>Web:</strong> el POS en el hosting o en otra red (por IP/dominio).<br />
          La sincronización usa siempre el perfil marcado como <strong>Activo</strong>.
        </p>

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
          <button type="button" className="btn-primary" onClick={conectado ? handleDesconectar : handleConectar}>
            {conectado ? 'Desconectar' : 'Conectar'}
          </button>
          {perfilSel !== perfilActivo && (
            <button type="button" className="btn-pos" onClick={handleActivar}>
              Activar este perfil
            </button>
          )}
          <button type="button" className="btn-pos" onClick={handleGuardar} disabled={guardando || conectado}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ===== Modo ===== */}
      <div className="config-card">
        <div className="config-head">
          <div>
            <h3>Modo de las transacciones</h3>
            <p className="pos-modo-desc">
              <strong>Automático:</strong> cada pago en el POS genera la transacción y otorga los puntos solo; si el
              cliente trae DUI y no existe, se agrega al módulo de clientes.<br />
              <strong>Manual:</strong> el recepcionista registra las transacciones a mano, como hasta ahora (sin sincronización con el POS).<br />
              <em>Aplica al perfil activo: <strong>{perfilActivo === 'local' ? 'Local' : 'Web'}</strong>.</em>
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
          {auto && esperaSync > 0 && (
            <span className="pos-nota-sync">El sistema sincroniza solo cada 2 min. Espera para volver a sincronizar.</span>
          )}
          <button
            type="button"
            className="btn-pos"
            onClick={handleSincronizar}
            disabled={sincronizando || !auto || esperaSync > 0}
          >
            {sincronizando ? 'Sincronizando…' : esperaSync > 0 ? `Espera ${esperaSync}s` : 'Sincronizar ahora'}
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
              <label>Clientes traídos desde el POS</label>
              <div className="config-input"><input type="text" value={estado.clientes_creados ?? 0} readOnly /></div>
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
