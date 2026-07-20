import nodemailer from 'nodemailer';

// ============================================================
//  Envío de correo (para el código de acceso del portal)
//  Configúralo en el .env con una cuenta de Gmail y una
//  "Contraseña de aplicación" (App Password, NO la normal):
//     CORREO_USUARIO=tucorreo@gmail.com
//     CORREO_CLAVE=xxxx xxxx xxxx xxxx
//  Si no está configurado, en desarrollo el código se imprime
//  en la consola del backend (para probar sin enviar correos).
// ============================================================
const crearTransportador = () => {
  if (!process.env.CORREO_USUARIO || !process.env.CORREO_CLAVE) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.CORREO_USUARIO, pass: process.env.CORREO_CLAVE },
  });
};

// Envía el código de acceso. Devuelve true si se envió, false si no hay correo configurado.
export const enviarCodigoAcceso = async (destino, codigo, minutos) => {
  const transportador = crearTransportador();
  if (!transportador) return false;

  await transportador.sendMail({
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
