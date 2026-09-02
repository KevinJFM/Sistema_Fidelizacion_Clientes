import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from './bd.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Envío de correo (OTP del portal + alertas de retención). El MARCO (logo, colores, pie) es fijo
// aquí; el CONTENIDO editable (asunto/títulos/textos/on-off) vive en la tabla plantillas_correo y se
// edita desde el panel. Configurar el remitente en .env (CORREO_USUARIO/CORREO_CLAVE, App Password de
// Gmail); si falta, los correos se omiten en silencio.
const crearTransportador = () => {
  if (!process.env.CORREO_USUARIO || !process.env.CORREO_CLAVE) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.CORREO_USUARIO, pass: process.env.CORREO_CLAVE },
  });
};

const remitente = () => `"Punta Diamantes" <${process.env.CORREO_USUARIO}>`;

// URL del portal del cliente (a donde apuntan los botones de los correos). Configurable por
// entorno (PORTAL_URL); por defecto, el portal en producción.
const PORTAL_URL   = (process.env.PORTAL_URL || 'https://puntos.puntadiamantes.com').replace(/\/+$/, '');
const PORTAL_LOGIN = `${PORTAL_URL}/login`;

// ─── Logo de marca ────────────────────────────────────────────────────────────
// El logo va incrustado por CID en los correos (Gmail/Outlook NO muestran SVG ni, muchas veces,
// data URIs en el cuerpo). Para la vista previa del panel se usa el mismo PNG como data URI.
const LOGO_CID  = 'logoPuntaDiamantes';
const LOGO_PATH = path.join(__dirname, 'logo-correo.png');
let LOGO_DATA_URI = '';
try {
  LOGO_DATA_URI = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
} catch {
  // Si faltara el archivo, los correos salen sin logo (no se rompe nada).
}
// Adjunto en línea para nodemailer (se referencia con src="cid:...").
const logoAdjunto = () => ({ filename: 'punta-diamantes.png', path: LOGO_PATH, cid: LOGO_CID });
// Cambia la referencia CID por el data URI, para poder mostrar la vista previa en el navegador.
export const htmlConLogoInline = (html) =>
  String(html || '').split(`cid:${LOGO_CID}`).join(LOGO_DATA_URI);

// ─── Tema claro/oscuro del correo ─────────────────────────────────────────────
// Overrides de modo oscuro (una regla por línea). Los estilos claros van en línea en cada bloque;
// estas reglas (con !important) los pisan cuando el cliente/panel está en oscuro.
const REGLAS_DARK = `
.pd-body{background:#0f1117 !important;}
.pd-card{background:#1b1f2e !important;border-color:#2a3160 !important;}
.pd-brand{color:#ffffff !important;}
.pd-title{color:#ffffff !important;}
.pd-value{color:#ffffff !important;}
.pd-text{color:#eef1ff !important;}
.pd-intro{color:#c7cef2 !important;}
.pd-muted{color:#c7cef2 !important;}
.pd-foot{color:#c7cef2 !important;}
.pd-foot strong{color:#ffffff !important;}
.pd-box{background:#2a3160 !important;}
.pd-divider{border-color:#3a4275 !important;}
.pd-money{color:#8ea2ff !important;}
`;
// Prefija cada regla con un selector padre (para forzar el tema por atributo en la vista previa).
const conScope = (prefijo) =>
  REGLAS_DARK.trim().split('\n').filter((l) => l.trim()).map((l) => `${prefijo} ${l.trim()}`).join('');

// Envuelve el contenido en un documento de correo completo.
//  tema: 'dark' | 'light' fuerza el tema (vista previa del panel); si se omite, el correo se adapta
//  solo al modo del teléfono/cliente (media query) — así llega a los clientes reales.
const documentoCorreo = (contenido, tema) => {
  let estilo;
  if (tema === 'dark') {
    estilo = `<style>${conScope('html[data-theme="dark"]')}</style>`;
  } else if (tema === 'light') {
    estilo = ''; // claro puro (sin media query para que no interfiera el modo del sistema)
  } else {
    estilo = `<style>@media (prefers-color-scheme: dark){${REGLAS_DARK}}</style>`;
  }
  const attr = tema === 'dark' ? ' data-theme="dark"' : '';
  return `<!doctype html><html lang="es"${attr}><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">` +
    `${estilo}</head>` +
    `<body class="pd-body" style="margin:0;padding:0;background:#eef0fc">` +
    `<div style="padding:22px 12px">${contenido}</div></body></html>`;
};

// Documento para la VISTA PREVIA del panel (fuerza el tema del panel y usa el logo en línea).
export const documentoPreview = (contenido, tema) => documentoCorreo(htmlConLogoInline(contenido), tema === 'dark' ? 'dark' : 'light');

// Envía un correo con el logo adjunto (todos los envíos pasan por aquí). Se envuelve en el
// documento completo (adaptable al modo del teléfono).
const enviarMail = (t, { to, asunto, html }) =>
  t.sendMail({ from: remitente(), to, subject: asunto, html: documentoCorreo(html), attachments: [logoAdjunto()] });

// ─── Sustitución de variables {clave} ─────────────────────────────────────────
// Escapa el VALOR (no el texto de la plantilla, que es de confianza) para no romper el HTML.
const escapar = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Para el asunto (texto plano): sin escapar.
const sustituirTexto = (texto, vars = {}) =>
  String(texto ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k] ?? '') : m));
// Para el cuerpo (HTML): escapando el valor.
const sustituirHtml = (texto, vars = {}) =>
  String(texto ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? escapar(vars[k]) : m));

// ─── Bloques HTML reutilizables (marco fijo de marca) ─────────────────────────
const htmlCabecera = (titulo, subtitulo) => `
<div class="pd-card" style="font-family:system-ui,Arial,sans-serif;max-width:440px;margin:auto;padding:28px 28px 20px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="vertical-align:middle;padding:0 16px 0 0">
        <img src="cid:${LOGO_CID}" alt="Punta Diamantes" width="48" height="48" style="display:block;border-radius:12px" />
      </td>
      <td style="vertical-align:middle">
        <span class="pd-brand" style="font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#0A1259;letter-spacing:.01em">Punta Diamantes</span>
      </td>
    </tr>
  </table>
  <h2 class="pd-title" style="color:#0A1259;margin:0 0 5px;font-size:20px;line-height:1.2">${titulo}</h2>
  ${subtitulo ? `<p class="pd-intro" style="color:#6b7280;margin:0 0 20px;font-size:14px;line-height:1.5">${subtitulo}</p>` : ''}`;

const htmlPie = () => `
  <hr class="pd-divider" style="border:none;border-top:1px solid #f3f4f6;margin:22px 0 16px">
  <p class="pd-foot" style="color:#6b7280;font-size:12.5px;margin:0;line-height:1.7;font-weight:600">
    <strong style="color:#374151;font-weight:700">Hotel Punta Diamantes · Sonsonate, El Salvador</strong><br>
    Recibiste este correo porque eres cliente registrado del programa de puntos.
  </p>
</div>`;

const htmlBarra = (porcentaje) => `
  <div class="pd-box" style="background:#f4f5fb;border-radius:8px;overflow:hidden;height:12px;margin:10px 0 5px">
    <div style="background:#E5388A;height:12px;width:${Math.min(Number(porcentaje) || 0, 100)}%;border-radius:8px"></div>
  </div>
  <p class="pd-muted" style="font-size:12px;color:#9ca3af;margin:0 0 18px;text-align:right">${escapar(porcentaje)}% completado</p>`;

const htmlPuntoDestacado = (puntos, etiqueta) => `
  <div class="pd-box" style="background:#f4f5fb;border-radius:12px;text-align:center;padding:16px;margin-bottom:16px">
    <div class="pd-value" style="font-size:36px;font-weight:800;color:#0A1259;letter-spacing:-1px;line-height:1">${escapar(puntos)}</div>
    <div class="pd-muted" style="font-size:13px;color:#6b7280;margin-top:4px">${escapar(etiqueta)}</div>
  </div>`;

const htmlBoton = (texto) => `
  <div style="text-align:center;margin:20px 0 4px">
    <a href="${PORTAL_LOGIN}" target="_blank" rel="noopener" style="display:inline-block;background:#E5388A;color:#fff;font-weight:700;font-size:14px;padding:11px 28px;border-radius:8px;letter-spacing:.01em;text-decoration:none">${texto}</a>
  </div>`;

const htmlCodigo = (codigo) => `
  <div class="pd-box" style="background:#f4f5fb;border-radius:12px;text-align:center;padding:18px;margin-bottom:16px">
    <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#E5388A">${escapar(codigo)}</span>
  </div>`;

const htmlRecompensaBox = ({ recompensa, recompensaPuntos, puntos }) => `
  <p class="pd-text" style="font-size:14px;color:#374151;margin:0 0 10px">Tu próxima recompensa:</p>
  <div class="pd-box" style="background:#f4f5fb;border-radius:12px;padding:14px 18px;margin-bottom:14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <tr>
        <td style="vertical-align:middle">
          <div class="pd-value" style="font-weight:700;color:#0A1259;font-size:15px">${escapar(recompensa)}</div>
          <div class="pd-muted" style="font-size:13px;color:#6b7280;margin-top:2px">${escapar(recompensaPuntos)} puntos requeridos</div>
        </td>
        <td style="vertical-align:middle;text-align:right;white-space:nowrap;padding-left:16px;font-size:22px;font-weight:800;color:#E5388A">${escapar(puntos)} pts</td>
      </tr>
    </table>
  </div>`;

const htmlListaAlcanzables = (alcanzables = []) => (alcanzables.length
  ? `<p class="pd-text" style="font-size:14px;color:#374151;margin:16px 0 8px;font-weight:600">Con tus puntos actuales ya puedes canjear:</p>
     <ul class="pd-text" style="margin:0 0 16px;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
       ${alcanzables.map((r) => `<li><strong>${escapar(r.nombre)}</strong> (${escapar(r.puntos)} pts)</li>`).join('')}
     </ul>`
  : `<p class="pd-muted" style="font-size:14px;color:#6b7280;margin:0 0 16px">Sigue acumulando puntos con tus próximas visitas para llegar a tu primer canje.</p>`);

// Bloque de comprobante: resumen financiero + puntos (recibo del consumo).
const htmlComprobante = ({ monto, descuento, total, puntosOtorgados, puntosCanjeados, recompensa }) => {
  const hayCanje = Number(puntosCanjeados) > 0;
  const boxGanados = `
    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;text-align:center;padding:12px">
      <div style="font-size:22px;font-weight:800;color:#16a34a">+${escapar(puntosOtorgados)}</div>
      <div style="font-size:12px;color:#374151;font-weight:700">Puntos ganados</div>
    </div>`;
  const boxCanjeados = `
    <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;text-align:center;padding:12px">
      <div style="font-size:22px;font-weight:800;color:#dc2626">-${escapar(puntosCanjeados)}</div>
      <div style="font-size:12px;color:#374151;font-weight:700">Puntos canjeados</div>
    </div>`;
  return `
  <div class="pd-box" style="background:#f4f5fb;border-radius:12px;padding:14px 18px;margin-bottom:14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <tr>
        <td class="pd-muted" style="font-size:14px;color:#6b7280;padding-bottom:8px">Monto consumido</td>
        <td class="pd-value" style="font-size:14px;color:#111827;font-weight:700;text-align:right;padding-bottom:8px">$${escapar(monto)}</td>
      </tr>
      <tr>
        <td class="pd-muted" style="font-size:14px;color:#6b7280;padding-bottom:10px">Descuento</td>
        <td style="font-size:14px;color:#16a34a;font-weight:700;text-align:right;padding-bottom:10px">-$${escapar(descuento)}</td>
      </tr>
      <tr>
        <td class="pd-value pd-divider" style="font-size:16px;color:#0A1259;font-weight:800;border-top:1px solid #e5e7eb;padding-top:10px">Total pagado</td>
        <td class="pd-money pd-divider" style="font-size:16px;color:#0D1BB8;font-weight:800;text-align:right;border-top:1px solid #e5e7eb;padding-top:10px">$${escapar(total)}</td>
      </tr>
    </table>
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:6px">
    <tr>
      ${hayCanje
        ? `<td style="width:50%;padding-right:5px;vertical-align:top">${boxGanados}</td>
           <td style="width:50%;padding-left:5px;vertical-align:top">${boxCanjeados}</td>`
        : `<td style="vertical-align:top">${boxGanados}</td>`}
    </tr>
  </table>
  ${recompensa ? `<p class="pd-muted" style="font-size:13px;color:#6b7280;margin:10px 0 0">Canje: <strong class="pd-value" style="color:#0A1259">${escapar(recompensa)}</strong></p>` : ''}`;
};

// Bloque de promoción: nombre, beneficio y vigencia (para los correos de promoción).
const htmlPromoBox = ({ promo, beneficio, vigencia, dias }) => `
  <div class="pd-box" style="background:#f4f5fb;border-radius:12px;padding:16px 18px;margin-bottom:16px;border-left:4px solid #E5388A">
    <div class="pd-value" style="font-weight:800;color:#0A1259;font-size:16px">${escapar(promo)}</div>
    ${beneficio ? `<div style="font-size:14px;color:#E5388A;font-weight:700;margin-top:4px">${escapar(beneficio)}</div>` : ''}
    ${vigencia ? `<div class="pd-muted" style="font-size:13px;color:#6b7280;margin-top:6px">Vigencia: ${escapar(vigencia)}</div>` : ''}
    ${dias ? `<div style="font-size:13px;color:#f87171;font-weight:700;margin-top:6px">¡Quedan ${escapar(dias)} días!</div>` : ''}
  </div>`;

// ─── Pipeline de armado ───────────────────────────────────────────────────────
// El "medio" es la parte ESTRUCTURAL (no editable) de cada correo: código, barra, lista, etc.
const construirMedio = (clave, vars = {}) => {
  switch (clave) {
    case 'otp':                 return htmlCodigo(vars.codigo);
    case 'cerca_canje':         return htmlRecompensaBox(vars) + htmlBarra(vars.porcentaje);
    case 'reactivacion':        return htmlPuntoDestacado(vars.puntos, 'puntos acumulados') + htmlListaAlcanzables(vars.alcanzables);
    case 'comprobante':         return htmlComprobante(vars);
    case 'promo_nueva':         return htmlPromoBox(vars);
    case 'promo_por_finalizar': return htmlPromoBox(vars);
    case 'bienvenida':          return '';
    default:                    return '';
  }
};

// Ensambla cabecera + medio estructural + cuerpo + botón + pie.
const ensamblar = ({ titulo, intro, medio = '', cuerpo, boton }) => `
  ${htmlCabecera(titulo, intro)}
  ${medio}
  ${cuerpo ? `<p class="pd-text" style="font-size:14px;color:#374151;margin:0 0 8px;line-height:1.6">${cuerpo}</p>` : ''}
  ${boton ? htmlBoton(boton) : ''}
  ${htmlPie()}`;

// A partir de una plantilla (fila de BD o editada) + variables, produce { asunto, html }.
const render = (plantilla, vars = {}) => {
  const medio = construirMedio(plantilla.clave, vars);
  const asunto = sustituirTexto(plantilla.asunto, vars);
  const html = ensamblar({
    titulo: sustituirHtml(plantilla.titulo, vars),
    intro:  sustituirHtml(plantilla.intro, vars),
    medio,
    cuerpo: sustituirHtml(plantilla.cuerpo, vars),
    boton:  plantilla.boton ? sustituirHtml(plantilla.boton, vars) : null,
  });
  return { asunto, html };
};

// Lee una plantilla por su clave.
export const cargarPlantilla = async (clave) => {
  const [filas] = await pool.query('SELECT * FROM plantillas_correo WHERE clave = ?', [clave]);
  return filas[0] || null;
};

// ¿Se debe enviar este correo? Solo si está activo (o es obligatorio, ej. OTP).
const debeEnviar = (plantilla) => !!plantilla && (plantilla.activo === 1 || plantilla.obligatorio === 1);

// Datos de EJEMPLO para la vista previa (no se envía nada real).
export const EJEMPLOS = {
  otp:          { codigo: '482913', minutos: 5 },
  cerca_canje:  { nombre: 'María', puntos: 560, recompensa: 'Pasanoche (Dom a Jue)', recompensaPuntos: 700, faltan: 140, porcentaje: 80 },
  reactivacion: { nombre: 'Carlos', puntos: 900, alcanzables: [
    { nombre: 'Pasanoche (Dom a Jue)', puntos: 700 },
    { nombre: 'Pasadía (Dom a Jue)',   puntos: 800 },
  ] },
  bienvenida:   { nombre: 'María' },
  comprobante:  { nombre: 'María', monto: '95.00', descuento: '2.00', total: '93.00', puntosOtorgados: 95, puntosCanjeados: 0, saldo: 340, recompensa: '' },
  promo_nueva:  { nombre: 'María', promo: '2x1 en Pasadía', beneficio: '25 pts extra y 10% de descuento', vigencia: '01/09/2026 al 15/09/2026' },
  promo_por_finalizar: { nombre: 'María', promo: '2x1 en Pasadía', beneficio: '25 pts extra y 10% de descuento', vigencia: '01/09/2026 al 15/09/2026', dias: 2 },
};

// Renderiza una plantilla con datos de ejemplo (para la vista previa del panel).
// Si la plantilla tiene un ajuste numérico `dias` (ej. promo_por_finalizar), se usa ese valor.
export const renderizarEjemplo = (plantilla) => {
  const vars = { ...(EJEMPLOS[plantilla.clave] || {}) };
  if (plantilla.dias != null && plantilla.dias !== '') vars.dias = plantilla.dias;
  return render(plantilla, vars);
};

// Envío genérico (para la prueba de plantilla y, más adelante, el envío manual). Devuelve false
// si el correo no está configurado.
export const enviarCorreo = async ({ to, asunto, html }) => {
  const t = crearTransportador();
  if (!t) return false;
  await enviarMail(t, { to, asunto, html });
  return true;
};

// ─── Correos concretos ────────────────────────────────────────────────────────

// 1. Código de acceso (OTP) — obligatorio (siempre se envía aunque esté "inactivo").
export const enviarCodigoAcceso = async (destino, codigo, minutos) => {
  const t = crearTransportador();
  if (!t) return false;
  const plantilla = await cargarPlantilla('otp');
  if (!debeEnviar(plantilla)) return false;

  const { asunto, html } = render(plantilla, { codigo, minutos });
  await enviarMail(t, { to: destino, asunto, html });
  return true;
};

// 2. Alerta "cerca del canje" (80%+ de la próxima recompensa).
export const enviarAlertaCercaDelCanje = async ({
  destino, nombre, puntosActuales, recompensaNombre, recompensaPuntos, faltan, porcentaje,
}) => {
  const t = crearTransportador();
  if (!t) return false;
  const plantilla = await cargarPlantilla('cerca_canje');
  if (!debeEnviar(plantilla)) return false;

  const vars = {
    nombre: String(nombre || '').split(' ')[0],
    puntos: puntosActuales,
    recompensa: recompensaNombre,
    recompensaPuntos,
    faltan,
    porcentaje,
  };
  const { asunto, html } = render(plantilla, vars);
  await enviarMail(t, { to: destino, asunto, html });
  return true;
};

// 3. Alerta de reactivación "Hace tiempo que no te vemos".
export const enviarAlertaReactivacion = async ({ destino, nombre, puntos, alcanzables }) => {
  const t = crearTransportador();
  if (!t) return false;
  const plantilla = await cargarPlantilla('reactivacion');
  if (!debeEnviar(plantilla)) return false;

  const vars = { nombre: String(nombre || '').split(' ')[0], puntos, alcanzables };
  const { asunto, html } = render(plantilla, vars);
  await enviarMail(t, { to: destino, asunto, html });
  return true;
};

// 4. Bienvenida al registrar un cliente nuevo.
export const enviarBienvenida = async ({ destino, nombre }) => {
  const t = crearTransportador();
  if (!t) return false;
  const plantilla = await cargarPlantilla('bienvenida');
  if (!debeEnviar(plantilla)) return false;

  const { asunto, html } = render(plantilla, { nombre: String(nombre || '').split(' ')[0] });
  await enviarMail(t, { to: destino, asunto, html });
  return true;
};

// 5. Comprobante de consumo/canje al registrar una transacción.
export const enviarComprobante = async ({
  destino, nombre, monto, descuento, total, puntosOtorgados, puntosCanjeados, saldo, recompensa,
}) => {
  const t = crearTransportador();
  if (!t) return false;
  const plantilla = await cargarPlantilla('comprobante');
  if (!debeEnviar(plantilla)) return false;

  const vars = {
    nombre: String(nombre || '').split(' ')[0],
    monto, descuento, total, puntosOtorgados, puntosCanjeados, saldo,
    recompensa: recompensa || '',
  };
  const { asunto, html } = render(plantilla, vars);
  await enviarMail(t, { to: destino, asunto, html });
  return true;
};

// ─── Correos masivos (promociones + newsletter) ───────────────────────────────
// Envío MASIVO por lotes con pausa, para no saturar Gmail (~500/día) ni que marque la cuenta.
const LOTE_MASIVO = 20;      // correos por lote
const PAUSA_LOTE_MS = 1500;  // pausa entre lotes

// Clientes elegibles para correos masivos: activos y con correo.
const clientesConCorreo = async () => {
  const [filas] = await pool.query(
    "SELECT nombres, correo FROM clientes WHERE id_estado = 1 AND correo IS NOT NULL AND correo <> ''"
  );
  return filas;
};

// Envía a una lista de clientes en lotes. `construir(cliente)` -> { asunto, html }.
const enviarLotes = async (clientes, construir) => {
  const t = crearTransportador();
  if (!t) return { enviados: 0, total: clientes.length, sinConfigurar: true };
  let enviados = 0;
  for (let i = 0; i < clientes.length; i += LOTE_MASIVO) {
    const lote = clientes.slice(i, i + LOTE_MASIVO);
    await Promise.all(lote.map(async (c) => {
      try {
        const { asunto, html } = construir(c);
        await enviarMail(t, { to: c.correo, asunto, html });
        enviados++;
      } catch {
        /* un correo fallido no detiene el lote */
      }
    }));
    if (i + LOTE_MASIVO < clientes.length) await new Promise((r) => setTimeout(r, PAUSA_LOTE_MS));
  }
  return { enviados, total: clientes.length };
};

// Texto del beneficio de una promo ("25 pts extra y 10% de descuento").
const beneficioPromo = (p) => {
  const x = [];
  if (Number(p.puntos_extra) > 0) x.push(`${Number(p.puntos_extra)} pts extra`);
  if (Number(p.descuento_extra) > 0) x.push(`${Number(p.descuento_extra)}% de descuento`);
  return x.join(' y ');
};
// Vigencia legible de una promo.
const vigenciaPromo = (p) => {
  const f = (d) => new Date(d).toLocaleDateString('es-SV');
  if (p.fecha_especial) return f(p.fecha_especial);
  if (p.fecha_inicio && p.fecha_fin) return `${f(p.fecha_inicio)} al ${f(p.fecha_fin)}`;
  return '';
};

// 6. Promoción NUEVA: aviso masivo al crearla.
export const enviarPromoNueva = async (promo) => {
  const plantilla = await cargarPlantilla('promo_nueva');
  if (!debeEnviar(plantilla)) return { enviados: 0, total: 0 };
  const clientes = await clientesConCorreo();
  const base = { promo: promo.nombre, beneficio: beneficioPromo(promo), vigencia: vigenciaPromo(promo) };
  return enviarLotes(clientes, (c) => render(plantilla, { ...base, nombre: String(c.nombres || '').split(' ')[0] }));
};

// 7. Promoción POR FINALIZAR: aviso masivo cuando está por terminar.
export const enviarPromoPorFinalizar = async (promo, dias) => {
  const plantilla = await cargarPlantilla('promo_por_finalizar');
  if (!debeEnviar(plantilla)) return { enviados: 0, total: 0 };
  const clientes = await clientesConCorreo();
  const base = { promo: promo.nombre, beneficio: beneficioPromo(promo), vigencia: vigenciaPromo(promo), dias };
  return enviarLotes(clientes, (c) => render(plantilla, { ...base, nombre: String(c.nombres || '').split(' ')[0] }));
};
