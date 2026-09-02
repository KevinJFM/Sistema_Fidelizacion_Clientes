// Push de promociones: al crear una que arranca hoy avisa en el momento; cada mañana (cron) avisa las programadas que arrancan ese día.
import pool from '../configuracion/bd.js';
import { enviarPush } from '../configuracion/push.js';
import { enviarPromoNueva, enviarPromoPorFinalizar } from '../configuracion/correo.js';

// Días de antelación con que se avisa que una promo va a terminar.
const DIAS_AVISO_FIN = 2;

// Arma el texto del push a partir de los datos de la promoción
const cuerpoPromo = (nombre, puntosExtra, descuentoExtra) => {
  const extras = [];
  if (Number(puntosExtra) > 0) extras.push(`+${Number(puntosExtra)} pts`);
  if (Number(descuentoExtra) > 0) extras.push(`${Number(descuentoExtra)}% de descuento`);
  const detalle = extras.length ? ` (${extras.join(' y ')})` : '';
  return `${String(nombre).trim()}${detalle}. ¡Aprovéchala hoy!`;
};

// Notifica a los clientes con la app las promos que arrancan hoy (CURDATE()). soloId: una sola promo (al crear); soloCreadasAntesDeHoy: solo creadas antes de hoy (cron, no repite las de hoy).
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

// Aviso por correo (masivo) de promociones que ARRANCAN: el día en que la promo entra en vigencia.
// Usa la marca `aviso_inicio_enviado` para enviar UNA sola vez, sin importar si el disparo viene de
// crear la promo (soloId) o del cron diario. Solo se marca como enviada si el correo sí salió
// (si el correo del servidor no está configurado, se reintenta en la próxima corrida).
export const avisarPromosQueInician = async ({ soloId = null } = {}) => {
  const condiciones = [
    'p.activo = 1',
    'p.aviso_inicio_enviado = 0',
    `( p.fecha_especial = CURDATE()
       OR (p.fecha_inicio IS NOT NULL AND p.fecha_fin IS NOT NULL AND CURDATE() BETWEEN p.fecha_inicio AND p.fecha_fin) )`,
  ];
  const params = [];
  if (soloId != null) { condiciones.push('p.id_escenario = ?'); params.push(soloId); }

  const [promos] = await pool.query(
    `SELECT id_escenario, nombre, puntos_extra, descuento_extra, fecha_inicio, fecha_fin, fecha_especial
       FROM promociones p WHERE ${condiciones.join(' AND ')}`,
    params
  );

  let avisadas = 0;
  for (const promo of promos) {
    try {
      const r = await enviarPromoNueva(promo);
      // Si el correo NO está configurado en el servidor, no marcamos: se reintenta luego.
      if (!r.sinConfigurar) {
        await pool.query('UPDATE promociones SET aviso_inicio_enviado = 1 WHERE id_escenario = ?', [promo.id_escenario]);
        avisadas++;
      }
    } catch {
      // Un fallo de correo no detiene el resto.
    }
  }
  if (avisadas) console.log(`[promociones.tarea] promo_nueva: ${avisadas} promo(s) avisada(s).`);
  return avisadas;
};

// Aviso por correo de promociones que están por terminar (exactamente DIAS_AVISO_FIN días antes de
// fecha_fin). Al comparar el día exacto, se envía UNA sola vez por promo (no se repite cada día).
// Solo aplica a promos con rango (fecha_fin); las de fecha_especial no tienen "por finalizar".
export const avisarPromosPorFinalizar = async () => {
  // Días de antelación EDITABLES desde el panel (plantilla promo_por_finalizar). Respaldo: DIAS_AVISO_FIN.
  const [[pl]] = await pool.query("SELECT dias FROM plantillas_correo WHERE clave = 'promo_por_finalizar'");
  const dias = Number(pl?.dias) > 0 ? Number(pl.dias) : DIAS_AVISO_FIN;

  const [promos] = await pool.query(
    `SELECT id_escenario, nombre, puntos_extra, descuento_extra, fecha_inicio, fecha_fin, fecha_especial
       FROM promociones
      WHERE activo = 1
        AND fecha_fin IS NOT NULL
        AND fecha_fin = DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [dias]
  );

  let avisadas = 0;
  for (const promo of promos) {
    try {
      await enviarPromoPorFinalizar(promo, dias);
      avisadas++;
    } catch {
      // Un fallo de correo no detiene el resto.
    }
  }
  if (avisadas) console.log(`[promociones.tarea] por_finalizar: ${avisadas} promo(s) avisada(s).`);
  return avisadas;
};

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Programa una tarea diaria a hora fija UTC. El Salvador es UTC-6 fijo: 8:00 AM local = 14:00 UTC.
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
    avisarPromosQueInician().catch(() => {});
    avisarPromosPorFinalizar().catch(() => {});
  });
};
