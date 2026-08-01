// Envía notificaciones push vía Expo (gratuito, sin API key). Recibe el Expo Push Token que registra la app al iniciar sesión.
export const enviarPush = async (token, titulo, cuerpo, datos = {}) => {
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: titulo,
        body: cuerpo,
        data: datos,
        channelId: 'default',
      }),
    });
  } catch {
    // Si falla el envío del push, NO se rompe la transacción.
  }
};
