import nodemailer from 'nodemailer';

// ============================================================
//  Envío de correo (OTP del portal + alertas de clientes)
//  Configúralo en el .env con una cuenta de Gmail y una
//  "Contraseña de aplicación" (App Password, NO la normal):
//     CORREO_USUARIO=tucorreo@gmail.com
//     CORREO_CLAVE=xxxx xxxx xxxx xxxx
//  Si no está configurado, los correos se omiten silenciosamente.
// ============================================================
const crearTransportador = () => {
  if (!process.env.CORREO_USUARIO || !process.env.CORREO_CLAVE) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.CORREO_USUARIO, pass: process.env.CORREO_CLAVE },
  });
};

// ─── Bloques HTML reutilizables ───────────────────────────────────────────────
const htmlCabecera = (titulo, subtitulo) => `
<div style="font-family:system-ui,Arial,sans-serif;max-width:440px;margin:auto;padding:28px 28px 20px;border:1px solid #e5e7eb;border-radius:16px;background:#ffffff">
  <div style="display:flex;align-items:center;gap:9px;margin-bottom:18px">
    <div style="width:18px;height:18px;background:#E5388A;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);flex-shrink:0"></div>
    <span style="font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#0A1259;letter-spacing:.01em">Punta Diamantes</span>
  </div>
  <h2 style="color:#0A1259;margin:0 0 5px;font-size:20px;line-height:1.2">${titulo}</h2>
  <p style="color:#6b7280;margin:0 0 20px;font-size:14px;line-height:1.5">${subtitulo}</p>`;

const htmlPie = () => `
  <hr style="border:none;border-top:1px solid #f3f4f6;margin:22px 0 16px">
  <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6">
    Hotel Punta Diamantes · Sonsonate, El Salvador<br>
    Recibiste este correo porque eres cliente registrado del programa de puntos.
  </p>
</div>`;

const htmlBarra = (porcentaje) => `
  <div style="background:#f4f5fb;border-radius:8px;overflow:hidden;height:12px;margin:10px 0 5px">
    <div style="background:#E5388A;height:12px;width:${Math.min(porcentaje, 100)}%;border-radius:8px"></div>
  </div>
  <p style="font-size:12px;color:#9ca3af;margin:0 0 18px;text-align:right">${porcentaje}% completado</p>`;

const htmlPuntoDestacado = (puntos, etiqueta) => `
  <div style="background:#f4f5fb;border-radius:12px;text-align:center;padding:16px;margin-bottom:16px">
    <div style="font-size:36px;font-weight:800;color:#0A1259;letter-spacing:-1px;line-height:1">${puntos}</div>
    <div style="font-size:13px;color:#6b7280;margin-top:4px">${etiqueta}</div>
  </div>`;

const htmlBoton = (texto) => `
  <div style="text-align:center;margin:20px 0 4px">
    <span style="display:inline-block;background:#E5388A;color:#fff;font-weight:700;font-size:14px;padding:11px 28px;border-radius:8px;letter-spacing:.01em">${texto}</span>
  </div>`;

// ─── 1. Código de acceso (OTP) ────────────────────────────────────────────────
export const enviarCodigoAcceso = async (destino, codigo, minutos) => {
  const t = crearTransportador();
  if (!t) return false;

  await t.sendMail({
    from: `"Punta Diamantes" <${process.env.CORREO_USUARIO}>`,
    to: destino,
    subject: 'Tu código de acceso · Punta Diamantes',
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:16px">
        <h2 style="color:#0A1259;margin:0 0 4px">Punta Diamantes</h2>
        <p style="color:#6b7280;margin:0 0 20px">Tu código de acceso a la app de puntos</p>
        <div style="background:#f4f5fb;border-radius:12px;text-align:center;padding:18px;margin-bottom:16px">
          <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#E5388A">${codigo}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;margin:0">Vence en ${minutos} minutos. No lo compartas con nadie.</p>
      </div>`,
  });
  return true;
};

// ─── 2. Alerta "cerca del canje" ─────────────────────────────────────────────
// Se envía cuando el cliente alcanza el 80 % de los puntos de su próxima recompensa.
export const enviarAlertaCercaDelCanje = async ({
  destino, nombre, puntosActuales, recompensaNombre, recompensaPuntos, faltan, porcentaje,
}) => {
  const t = crearTransportador();
  if (!t) return false;

  await t.sendMail({
    from: `"Punta Diamantes" <${process.env.CORREO_USUARIO}>`,
    to: destino,
    subject: `¡Casi llegas a "${recompensaNombre}"! · Punta Diamantes`,
    html: `
      ${htmlCabecera(
        `¡Casi llegas, ${nombre.split(' ')[0]}!`,
        `Solo te faltan <strong style="color:#E5388A">${faltan} puntos</strong> para obtener tu próximo canje.`
      )}

      <p style="font-size:14px;color:#374151;margin:0 0 10px">Tu próxima recompensa:</p>
      <div style="background:#f4f5fb;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;color:#0A1259;font-size:15px">${recompensaNombre}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px">${recompensaPuntos} puntos requeridos</div>
        </div>
        <div style="font-size:22px;font-weight:800;color:#E5388A;white-space:nowrap;padding-left:16px">${puntosActuales} pts</div>
      </div>

      ${htmlBarra(porcentaje)}

      <p style="font-size:14px;color:#6b7280;margin:0 0 8px">
        Con tu próxima visita al hotel puedes completar tus puntos y reclamar
        <strong style="color:#0A1259">${recompensaNombre}</strong> en recepción.
      </p>

      ${htmlBoton('Ver mis puntos en el portal')}

      ${htmlPie()}`,
  });
  return true;
};

// ─── 3. Alerta de reactivación "Hace tiempo que no te vemos" ─────────────────
export const enviarAlertaReactivacion = async ({ destino, nombre, puntos, alcanzables }) => {
  const t = crearTransportador();
  if (!t) return false;

  const listaAlcanzables = alcanzables.length
    ? `<p style="font-size:14px;color:#374151;margin:16px 0 8px;font-weight:600">Con tus puntos actuales ya puedes canjear:</p>
       <ul style="margin:0 0 16px;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
         ${alcanzables.map(r => `<li><strong>${r.nombre}</strong> (${r.puntos} pts)</li>`).join('')}
       </ul>
       <p style="font-size:14px;color:#6b7280;margin:0 0 8px">Visítanos y pídelo en recepción. ¡No dejes que tus puntos esperen!</p>`
    : `<p style="font-size:14px;color:#6b7280;margin:0 0 16px">Sigue acumulando puntos con tus próximas visitas para llegar a tu primer canje.</p>`;

  await t.sendMail({
    from: `"Punta Diamantes" <${process.env.CORREO_USUARIO}>`,
    to: destino,
    subject: `Te echamos de menos, ${nombre.split(' ')[0]} · Punta Diamantes`,
    html: `
      ${htmlCabecera(
        `Hace tiempo que no te vemos, ${nombre.split(' ')[0]}`,
        'Tus puntos siguen aquí, esperándote.'
      )}

      ${htmlPuntoDestacado(puntos, 'puntos acumulados')}

      ${listaAlcanzables}

      <p style="font-size:14px;color:#6b7280;margin:0 0 8px">
        Recuerda que en cada consumo en el hotel ganas puntos automáticamente.
        ¡Te esperamos pronto en Punta Diamantes!
      </p>

      ${htmlBoton('Ver mi saldo en el portal')}

      ${htmlPie()}`,
  });
  return true;
};
