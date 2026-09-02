import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import { limpiar, crearUsuarioConToken, crearRecompensa, pool } from '../helpers/db.js';

let token;

beforeEach(async () => {
  await limpiar();
  ({ token } = await crearUsuarioConToken({ rol: 'recepcionista' }));
});

const crearOperador = async () => {
  const [r] = await pool.query(
    "INSERT INTO operadores_turisticos (nombre, tipo, telefono, correo, id_estado) VALUES ('Op Test', 'Empresa', NULL, NULL, 1)"
  );
  return r.insertId;
};
const puntosOp = async (id) => {
  const [f] = await pool.query('SELECT puntos_acumulados FROM operadores_turisticos WHERE id_operador = ?', [id]);
  return Number(f[0].puntos_acumulados);
};

const registrar = (body) =>
  request(app).post('/api/operadores/transacciones').set('Authorization', `Bearer ${token}`).send(body);
const canjear = (body) =>
  request(app).post('/api/operadores/canje').set('Authorization', `Bearer ${token}`).send(body);
const anular = (id, body) =>
  request(app).put(`/api/operadores/transacciones/${id}/anular`).set('Authorization', `Bearer ${token}`).send(body);

describe('PUT /api/operadores/transacciones/:id/anular — anular registro de operador', () => {
  it('revierte los puntos otorgados y marca el registro como anulado', async () => {
    const idOp = await crearOperador();
    const reg = await registrar({ id_operador: idOp, num_personas: 12 }); // 12 >= mínimo => +100
    expect(reg.body.puntos_otorgados).toBe(100);
    expect(await puntosOp(idOp)).toBe(100);

    const res = await anular(reg.body.id_transaccion_op, { motivo: 'número de personas equivocado' });
    expect(res.status).toBe(200);
    expect(res.body.saldo_puntos).toBe(0);
    expect(await puntosOp(idOp)).toBe(0);

    const [rows] = await pool.query(
      'SELECT anulada, motivo_anulacion, anulada_por FROM transacciones_operador WHERE id_transaccion_op = ?',
      [reg.body.id_transaccion_op]
    );
    expect(rows[0].anulada).toBe(1);
    expect(rows[0].motivo_anulacion).toBe('número de personas equivocado');
    expect(rows[0].anulada_por).not.toBeNull();
  });

  it('exige motivo (400)', async () => {
    const idOp = await crearOperador();
    const reg = await registrar({ id_operador: idOp, num_personas: 12 });
    expect((await anular(reg.body.id_transaccion_op, {})).status).toBe(400);
    expect(await puntosOp(idOp)).toBe(100); // no se tocó nada
  });

  it('no deja anular dos veces (400)', async () => {
    const idOp = await crearOperador();
    const reg = await registrar({ id_operador: idOp, num_personas: 12 });
    expect((await anular(reg.body.id_transaccion_op, { motivo: 'a' })).status).toBe(200);
    expect((await anular(reg.body.id_transaccion_op, { motivo: 'b' })).status).toBe(400);
    expect(await puntosOp(idOp)).toBe(0); // revertido una sola vez
  });

  it('no anula si el operador ya gastó esos puntos (saldo quedaría negativo)', async () => {
    const idOp = await crearOperador();
    const reg = await registrar({ id_operador: idOp, num_personas: 12 }); // +100
    const idRec = await crearRecompensa({ puntos: 100 });
    await canjear({ id_operador: idOp, id_recompensa: idRec });          // -100 => 0
    expect(await puntosOp(idOp)).toBe(0);

    const res = await anular(reg.body.id_transaccion_op, { motivo: 'ya no aplica' });
    expect(res.status).toBe(400);
    expect(await puntosOp(idOp)).toBe(0); // intacto
  });

  it('404 si el registro no existe', async () => {
    expect((await anular(999999, { motivo: 'x' })).status).toBe(404);
  });
});
