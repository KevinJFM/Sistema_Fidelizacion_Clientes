import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { solicitarCodigo, verificarCodigo, mensajeError } from '../servicios/servicioPortal';
import { usarAvisos } from '../componentes/Avisos';
import { formatearDocumento, esDuiValido, esPasaporteValido } from '../utilidades/formato';
import Logo from '../componentes/Logo';

const SEGUNDOS_REENVIO = 60;

export default function Login() {
  const navigate = useNavigate();
  const mostrarAviso = usarAvisos();
  const [paso, setPaso] = useState('documento'); // 'documento' | 'codigo'
  const [tipo, setTipo] = useState('DUI');
  const [numero, setNumero] = useState('');
  const [codigo, setCodigo] = useState('');
  const [destino, setDestino] = useState('');
  const [modoDev, setModoDev] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const refCodigo = useRef(null);

  // Si llegó aquí porque la sesión expiró, avísale (una sola vez)
  useEffect(() => {
    if (localStorage.getItem('sesion_expirada')) {
      localStorage.removeItem('sesion_expirada');
      mostrarAviso('info', 'Tu sesión expiró', 'Por tu seguridad, ingresa de nuevo.');
    }
  }, []);

  // Cuenta regresiva para reenviar
  useEffect(() => {
    if (segundos <= 0) return;
    const id = setInterval(() => setSegundos((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [segundos]);

  // Al pasar al paso del código, enfoca el campo
  useEffect(() => {
    if (paso === 'codigo') setTimeout(() => refCodigo.current?.focus(), 150);
  }, [paso]);

  const enviarCodigo = async () => {
    if (tipo === 'DUI' && !esDuiValido(numero)) {
      return mostrarAviso('error', 'DUI inválido', 'El DUI debe tener el formato 00000000-0');
    }
    if (tipo === 'Pasaporte' && !esPasaporteValido(numero)) {
      return mostrarAviso('error', 'Pasaporte inválido', 'El pasaporte debe tener de 6 a 12 caracteres (letras y números)');
    }
    setCargando(true);
    try {
      const r = await solicitarCodigo({ tipo_documento: tipo, numero_documento: numero.trim() });
      setDestino(r.destino || 'tu correo');
      setModoDev(!!r.modo_dev);
      setCodigo('');
      setSegundos(SEGUNDOS_REENVIO);
      setPaso('codigo');
    } catch (error) {
      mostrarAviso('error', 'No se pudo enviar', mensajeError(error, 'No se pudo enviar el código'));
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async (valor) => {
    const cod = valor ?? codigo;
    if (cod.length !== 6 || cargando) return;
    setCargando(true);
    try {
      const r = await verificarCodigo({ tipo_documento: tipo, numero_documento: numero.trim(), codigo: cod });
      localStorage.setItem('portal_token', r.token);
      // Primera vez de todas -> bienvenida; luego -> directo al portal
      if (localStorage.getItem('bienvenida_vista')) navigate('/', { replace: true });
      else navigate('/bienvenida', { replace: true });
    } catch (error) {
      setCodigo('');
      mostrarAviso('error', 'Código incorrecto', mensajeError(error, 'No se pudo verificar el código'));
    } finally {
      setCargando(false);
    }
  };

  const alEscribirCodigo = (texto) => {
    const limpio = texto.replace(/[^0-9]/g, '').slice(0, 6);
    setCodigo(limpio);
    if (limpio.length === 6) confirmar(limpio); // verifica automáticamente al completar
  };

  return (
    <div className="pt-login">
      <div className="pt-login-card">
        <div className="pt-logo"><Logo size={116} color="#E5388A" /></div>
        <h1 className="pt-brand">Punta Diamantes</h1>
        <p className="pt-sub">Consulta tus puntos de fidelidad</p>

        {paso === 'documento' ? (
          <div className="pt-form">
            <label className="pt-field">
              <span>Tipo de documento</span>
              <div className="pt-selector">
                {['DUI', 'Pasaporte'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={tipo === op ? 'activo' : ''}
                    onClick={() => { setTipo(op); setNumero(''); }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </label>

            <label className="pt-field">
              <span>N° de documento</span>
              <input
                value={numero}
                onChange={(e) => setNumero(formatearDocumento(tipo, e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && enviarCodigo()}
                placeholder={tipo === 'DUI' ? '00000000-0' : 'Ej. A1234567'}
                inputMode={tipo === 'DUI' ? 'numeric' : 'text'}
                autoComplete="off"
                maxLength={tipo === 'DUI' ? 10 : 12}
              />
            </label>

            <button className="pt-btn" onClick={enviarCodigo} disabled={cargando}>
              {cargando ? 'Enviando…' : 'Enviar código'}
            </button>

            <p className="pt-nota">
              Te enviaremos un código de verificación a tu correo registrado para un ingreso único y seguro.
            </p>
          </div>
        ) : (
          <div className="pt-form">
            <h2 className="pt-codigo-titulo">Ingresa el código</h2>
            <p className="pt-sub">Lo enviamos a {destino}</p>

            {/* Casillas de código: input real transparente encima */}
            <div className="pt-codigo-wrap" onClick={() => refCodigo.current?.focus()}>
              <div className="pt-codigo-cajas">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`pt-codigo-caja ${codigo.length === i ? 'activa' : ''}`}>
                    {codigo[i] ?? ''}
                  </div>
                ))}
              </div>
              <input
                ref={refCodigo}
                className="pt-codigo-input"
                value={codigo}
                onChange={(e) => alEscribirCodigo(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
            </div>

            {cargando && <div className="pt-spinner" style={{ margin: '16px auto 0' }} />}

            {modoDev && (
              <p className="pt-nota-dev">
                Modo prueba: el código está en la consola del backend (no se configuró el correo).
              </p>
            )}

            <button
              className="pt-link"
              onClick={() => segundos === 0 && enviarCodigo()}
              disabled={segundos > 0}
            >
              {segundos > 0 ? `Reenviar código en ${segundos}s` : 'Reenviar código'}
            </button>

            <button className="pt-link tenue" onClick={() => { setPaso('documento'); setCodigo(''); }}>
              ‹ Cambiar documento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
