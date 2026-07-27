// ============================================================
//  Tareas programadas de retención de clientes.
//
//  1. alertarCercaDelCanje  — corre diario a las 9:00 AM (El Salvador).
//     Por cada cliente activo con correo, busca su próxima recompensa
//     inalcanzable. Si ya está al 80 % o más de los puntos requeridos,
//     envía un correo de "¡casi llegas!". No re-envía si ya lo notificó
//     en los últimos 30 días para esa misma recompensa.
//
//  2. alertarInactivos  — corre diario a las 9:00 AM (El Salvador).
//     Si un cliente con puntos no tiene transacciones en el último mes,
//     envía un correo de "hace tiempo que no te vemos" con su saldo y
//     las recompensas que ya puede canjear. Cooldown de 30 días.
// ============================================================
import pool from '../configuracion/bd.js';
import { enviarAlertaCercaDelCanje, enviarAlertaReactivacion } from '../configuracion/correo.js';

// ─── helpers de la tabla alertas_enviadas ─────────────────────────────────────
const yaNotificado = async (idCliente, tipo, referencia, diasCooldown = 30) => {
  const refParam = referencia ?? null;
  const [rows] = await pool.query(
    `SELECT id FROM alertas_enviadas
     WHERE id_cliente = ?
       AND tipo = ?
       AND (referencia <=> ?)
       AND fecha_enviada >= DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT 1`,
    [idCliente, tipo, refParam, diasCooldown]
  );
  return rows.length > 0;
};

const registrarAlerta = async (idCliente, tipo, referencia) => {
  await pool.query(
    'INSERT INTO alertas_enviadas (id_cliente, tipo, referencia) VALUES (?, ?, ?)',
    [idCliente, tipo, referencia ?? null]
  );
};

// ─── 1. Alerta "¡casi llegas a tu próximo canje!" ────────────────────────────
export const alertarCercaDelCanje = async () => {
  const [recompensas] = await pool.query(
    'SELECT id, nombre, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
  );
  if (recompensas.length === 0) return { enviados: 0 };

  const [clientes] = await pool.query(
    `SELECT id_cliente, nombres, correo, puntos_acumulados
     FROM clientes
     WHERE correo IS NOT NULL AND puntos_acumulados > 0 AND id_estado = 1`
  );

  let enviados = 0;
  for (const cliente of clientes) {
    // Recompensa más barata que aún no puede pagar
    const siguiente = recompensas.find((r) => r.puntos > cliente.puntos_acumulados);
    if (!siguiente) continue; // ya puede pagar todas, no aplica

    const porcentaje = Math.round((cliente.puntos_acumulados / siguiente.puntos) * 100);
    if (porcentaje < 80) continue;

    const ref = String(siguiente.id);
    if (await yaNotificado(cliente.id_cliente, 'cerca_canje', ref)) continue;

    try {
      const enviado = await enviarAlertaCercaDelCanje({
        destino:          cliente.correo,
        nombre:           cliente.nombres,
        puntosActuales:   cliente.puntos_acumulados,
        recompensaNombre: siguiente.nombre,
        recompensaPuntos: siguiente.puntos,
        faltan:           siguiente.puntos - cliente.puntos_acumulados,
        porcentaje,
      });
      if (enviado) {
        await registrarAlerta(cliente.id_cliente, 'cerca_canje', ref);
        enviados++;
      }
    } catch {
      // Un correo fallido no detiene el bucle
    }
  }

  console.log(`[clientes.tarea] cerca_canje: ${enviados} correo(s) enviado(s).`);
  return { enviados };
};

// ─── 2. Alerta de reactivación ────────────────────────────────────────────────
export const alertarInactivos = async () => {
  const [clientes] = await pool.query(
    `SELECT c.id_cliente, c.nombres, c.correo, c.puntos_acumulados
     FROM clientes c
     WHERE c.correo IS NOT NULL
       AND c.puntos_acumulados > 0
       AND c.id_estado = 1
       AND NOT EXISTS (
         SELECT 1 FROM transacciones t
         WHERE t.id_cliente = c.id_cliente
           AND t.fecha >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
       )`
  );

  const [recompensas] = await pool.query(
    'SELECT nombre, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
  );

  let enviados = 0;
  for (const cliente of clientes) {
    if (await yaNotificado(cliente.id_cliente, 'reactivacion', null)) continue;

    const alcanzables = recompensas.filter((r) => r.puntos <= cliente.puntos_acumulados);

    try {
      const enviado = await enviarAlertaReactivacion({
        destino:    cliente.correo,
        nombre:     cliente.nombres,
        puntos:     cliente.puntos_acumulados,
        alcanzables,
      });
      if (enviado) {
        await registrarAlerta(cliente.id_cliente, 'reactivacion', null);
        enviados++;
      }
    } catch {
      // Un correo fallido no detiene el bucle
    }
  }

  console.log(`[clientes.tarea] reactivacion: ${enviados} correo(s) enviado(s).`);
  return { enviados };
};

// ─── Scheduler ────────────────────────────────────────────────────────────────
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Programa una tarea diaria a una hora fija en UTC.
// El Salvador es UTC-6 fijo (sin horario de verano): 9:00 AM = 15:00 UTC.
const programarDiarioUTC = (horaUTC, tarea) => {
  const ahora   = new Date();
  const proximo = new Date(Date.UTC(
    ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), horaUTC, 0, 0, 0
  ));
  if (proximo <= ahora) proximo.setUTCDate(proximo.getUTCDate() + 1);
  setTimeout(() => { tarea(); setInterval(tarea, UN_DIA_MS); }, proximo.getTime() - ahora.getTime());
};

export const iniciarTareasClientes = () => {
  // 9:00 AM El Salvador (UTC-6) = 15:00 UTC, un minuto después de las promociones (14:00 UTC)
  programarDiarioUTC(15, () => {
    alertarCercaDelCanje().catch(() => {});
    alertarInactivos().catch(() => {});
  });
};
