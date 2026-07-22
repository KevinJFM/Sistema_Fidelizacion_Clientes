// ============================================================
//  Notificaciones push de promociones.
//  - Al CREAR una promo que arranca hoy: se avisa en el momento.
//  - Cada mañana (cron): se avisa de las promos programadas que
//    arrancan ese día (creadas en días anteriores).
//  Así una promo creada hoy para el futuro igual avisa el día que empieza.
// ============================================================
import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';

// Arma el texto del push a partir de los datos de la promoción
const cuerpoPromo = (nombre, puntosExtra, descuentoExtra) => {
  const extras = [];
  if (Number(puntosExtra) > 0) extras.push(`+${Number(puntosExtra)} pts`);
  if (Number(descuentoExtra) > 0) extras.push(`${Number(descuentoExtra)}% de descuento`);
  const detalle = extras.length ? ` (${extras.join(' y ')})` : '';
  return `${String(nombre).trim()}${detalle}. ¡Aprovéchala hoy!`;
};

/**
 * Notifica a TODOS los clientes con la app sobre las promociones activas que
 * arrancan HOY. La condición "empieza hoy" se evalúa con CURDATE() en la base
 * (misma lógica de fechas del resto del sistema, sin desfases de zona horaria).
 *
 * @param {object} opciones
 * @param {number|null} opciones.soloId  Notificar solo esta promo (al crearla).
 * @param {boolean} opciones.soloCreadasAntesDeHoy  Solo las creadas en días
 *        anteriores (lo usa el cron, para no repetir las creadas hoy que ya se
 *        avisaron en el momento de crearse).
 */
export const notificarPromosDeHoy = async ({ soloId = null, soloCreadasAntesDeHoy = false } = {}) => {
  const condiciones = [];
  const params = [];
  if (soloId != null) {
    condiciones.push('p.id_escenario = ?');
    params.push(soloId);
  }
  if (soloCreadasAntesDeHoy) {
    condiciones.push('DATE(p.created_at) < CURDATE()');
  }
  const extra = condiciones.length ? `AND ${condiciones.join(' AND ')}` : '';

  const [promos] = await pool.query(
    `SELECT id_escenario, nombre, puntos_extra, descuento_extra
       FROM promociones p
      WHERE p.activo = 1
        AND (p.fecha_especial = CURDATE() OR p.fecha_inicio = CURDATE())
        ${extra}`,
    params
  );
  if (promos.length === 0) return 0;

  const [clientes] = await pool.query(
    `SELECT push_token FROM clientes WHERE push_token IS NOT NULL`
  );
  if (clientes.length === 0) return 0;

  for (const promo of promos) {
    const cuerpo = cuerpoPromo(promo.nombre, promo.puntos_extra, promo.descuento_extra);
    for (const { push_token } of clientes) {
      enviarPush(push_token, 'Nueva promoción disponible', cuerpo, { tipo: 'promocion' });
    }
  }
  return promos.length;
};

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Programa una tarea para que corra todos los días a una hora fija en UTC.
// (El Salvador es UTC−6 fijo, sin horario de verano: 8:00 AM local = 14:00 UTC.)
const programarDiarioUTC = (horaUTC, tarea) => {
  const ahora = new Date();
  const proximo = new Date(Date.UTC(
    ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), horaUTC, 0, 0, 0
  ));
  if (proximo <= ahora) proximo.setUTCDate(proximo.getUTCDate() + 1);

  setTimeout(() => {
    tarea();
    setInterval(tarea, UN_DIA_MS);
  }, proximo.getTime() - ahora.getTime());
};

// Programa el aviso diario de las promociones que arrancan cada día (8:00 AM El Salvador).
export const iniciarTareasProgramadas = () => {
  programarDiarioUTC(14, () => {
    notificarPromosDeHoy({ soloCreadasAntesDeHoy: true }).catch(() => {});
  });
};
