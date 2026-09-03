// Tareas de retención de OPERADORES turísticos (diario 10:00 AM El Salvador):
//  1. alertarCercaDelCanjeOperador: operador al 80%+ de su próxima recompensa → "¡casi llegas!".
//  2. enviarResumenMensualOperadores: 1 vez por mes, su saldo + las recompensas que ya puede
//     canjear (el operador NO entra al portal, así que este correo hace de "estado de cuenta").
// El envío se rastrea en `alertas_enviadas_operador` para no repetir (paralela a la de clientes).
import pool from '../configuracion/bd.js';
import { enviarAlertaCercaDelCanjeOperador, enviarResumenOperador } from '../configuracion/correo.js';

// ─── helpers de la tabla alertas_enviadas_operador ────────────────────────────
// cerca_canje: cooldown de 30 días por recompensa. resumen: 1 por período (YYYY-MM) sin importar la fecha.
const yaNotificado = async (idOperador, tipo, referencia, diasCooldown = 30) => {
  const refParam = referencia ?? null;
  const [rows] = await pool.query(
    `SELECT id FROM alertas_enviadas_operador
     WHERE id_operador = ?
       AND tipo = ?
       AND (referencia <=> ?)
       AND fecha_enviada >= DATE_SUB(NOW(), INTERVAL ? DAY)
     LIMIT 1`,
    [idOperador, tipo, refParam, diasCooldown]
  );
  return rows.length > 0;
};

// El resumen es mensual: basta con que exista un registro de ese período (no depende de la fecha).
const yaEnviadoResumen = async (idOperador, periodo) => {
  const [rows] = await pool.query(
    `SELECT id FROM alertas_enviadas_operador
     WHERE id_operador = ? AND tipo = 'resumen' AND referencia = ? LIMIT 1`,
    [idOperador, periodo]
  );
  return rows.length > 0;
};

const registrarAlerta = async (idOperador, tipo, referencia) => {
  await pool.query(
    'INSERT INTO alertas_enviadas_operador (id_operador, tipo, referencia) VALUES (?, ?, ?)',
    [idOperador, tipo, referencia ?? null]
  );
};

// Operadores activos con correo y saldo (destinatarios de ambos correos).
const operadoresElegibles = async () => {
  const [filas] = await pool.query(
    `SELECT id_operador, nombre, correo, puntos_acumulados
     FROM operadores_turisticos
     WHERE correo IS NOT NULL AND correo <> '' AND puntos_acumulados > 0 AND id_estado = 1`
  );
  return filas;
};

// ─── 1. Alerta "¡casi llegas a tu próximo canje!" (operador) ──────────────────
export const alertarCercaDelCanjeOperador = async () => {
  const [recompensas] = await pool.query(
    'SELECT id, nombre, puntos FROM recompensas WHERE activo = 1 ORDER BY puntos ASC'
  );
  if (recompensas.length === 0) return { enviados: 0 };

  const operadores = await operadoresElegibles();

  let enviados = 0;
  for (const op of operadores) {
    // Recompensa más barata que aún NO puede pagar.
    const siguiente = recompensas.find((r) => r.puntos > op.puntos_acumulados);
    if (!siguiente) continue; // ya puede pagar todas, no aplica

    const porcentaje = Math.round((op.puntos_acumulados / siguiente.puntos) * 100);
    if (porcentaje < 80) continue;

    const ref = String(siguiente.id);
    if (await yaNotificado(op.id_operador, 'cerca_canje', ref)) continue;

    try {
      const enviado = await enviarAlertaCercaDelCanjeOperador({
        destino:          op.correo,
        nombre:           op.nombre,
        puntosActuales:   op.puntos_acumulados,
        recompensaNombre: siguiente.nombre,
        recompensaPuntos: siguiente.puntos,
        faltan:           siguiente.puntos - op.puntos_acumulados,
        porcentaje,
      });
      if (enviado) {
        await registrarAlerta(op.id_operador, 'cerca_canje', ref);
        enviados++;
      }
    } catch {
      // Un correo fallido no detiene el bucle.
    }
  }

  console.log(`[operadores.tarea] cerca_canje: ${enviados} correo(s) enviado(s).`);
  return { enviados };
};

// ─── 2. Resumen mensual (operador) ────────────────────────────────────────────
// Se auto-limita a 1 por mes (columna referencia = período YYYY-MM). Corre a diario, pero solo
// dispara en la primera ejecución del mes: así sale a comienzos de mes y se recupera si el
// servidor estaba apagado el día 1.
export const enviarResumenMensualOperadores = async () => {
  // Período actual en hora de El Salvador (la conexión MySQL ya está en UTC-6).
  const [[{ periodo }]] = await pool.query("SELECT DATE_FORMAT(NOW(), '%Y-%m') AS periodo");

  const operadores = await operadoresElegibles();

  let enviados = 0;
  for (const op of operadores) {
    if (await yaEnviadoResumen(op.id_operador, periodo)) continue;

    try {
      // El catálogo de canjes lo arma el propio correo (recompensas activas de la BD).
      const enviado = await enviarResumenOperador({
        destino:     op.correo,
        nombre:      op.nombre,
        puntos:      op.puntos_acumulados,
      });
      if (enviado) {
        await registrarAlerta(op.id_operador, 'resumen', periodo);
        enviados++;
      }
    } catch {
      // Un correo fallido no detiene el bucle.
    }
  }

  console.log(`[operadores.tarea] resumen ${periodo}: ${enviados} correo(s) enviado(s).`);
  return { enviados };
};

// ─── Scheduler ────────────────────────────────────────────────────────────────
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Programa una tarea diaria a hora fija UTC. El Salvador es UTC-6 fijo: 10:00 AM = 16:00 UTC.
const programarDiarioUTC = (horaUTC, tarea) => {
  const ahora   = new Date();
  const proximo = new Date(Date.UTC(
    ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), horaUTC, 0, 0, 0
  ));
  if (proximo <= ahora) proximo.setUTCDate(proximo.getUTCDate() + 1);
  setTimeout(() => { tarea(); setInterval(tarea, UN_DIA_MS); }, proximo.getTime() - ahora.getTime());
};

export const iniciarTareasOperadores = () => {
  // 10:00 AM El Salvador (UTC-6) = 16:00 UTC, después de clientes (15:00 UTC).
  programarDiarioUTC(16, () => {
    alertarCercaDelCanjeOperador().catch(() => {});
    enviarResumenMensualOperadores().catch(() => {});
  });
};
