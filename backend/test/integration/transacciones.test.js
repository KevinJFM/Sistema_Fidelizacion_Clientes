import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import {
  limpiar, crearUsuarioConToken, crearCliente, crearRecompensa,
  setConfig, puntosDe, pool,
} from '../helpers/db.js';

let token;

beforeEach(async () => {
  await limpiar();
  ({ token } = await crearUsuarioConToken({ rol: 'recepcionista' }));
});

const post = (body) =>
  request(app).post('/api/transacciones').set('Authorization', `Bearer ${token}`).send(body);

const put = (id, body) =>
  request(app).put(`/api/transacciones/${id}`).set('Authorization', `Bearer ${token}`).send(body);

const anular = (id, body) =>
  request(app).put(`/api/transacciones/${id}/anular`).set('Authorization', `Bearer ${token}`).send(body);

describe('POST /api/transacciones — validaciones', () => {
  it('rechaza monto no positivo (400)', async () => {
    const id = await crearCliente();
    expect((await post({ id_cliente: id, monto: 0 })).status).toBe(400);
    expect((await post({ id_cliente: id, monto: -5 })).status).toBe(400);
  });

  it('404 si el cliente no existe', async () => {
    expect((await post({ id_cliente: 999999, monto: 20 })).status).toBe(404);
  });

  it('400 si el cliente está inactivo', async () => {
    const id = await crearCliente({ estado: 2 });
    expect((await post({ id_cliente: id, monto: 20 })).status).toBe(400);
  });
});

describe('POST /api/transacciones — acumulación de puntos', () => {
  it('otorga 1 punto por $1 y actualiza el saldo del cliente', async () => {
    const id = await crearCliente({ puntos: 0 });
    const res = await post({ id_cliente: id, monto: 50 });

    expect(res.status).toBe(201);
    expect(res.body.puntos_otorgados).toBe(50);
    expect(res.body.saldo_puntos).toBe(50);
    expect(res.body.primera_compra).toBe(true);
    expect(await puntosDe(id)).toBe(50);

    // Debe quedar registrado en el libro mayor de puntos como 'ganado'.
    const [mov] = await pool.query(
      "SELECT tipo, puntos FROM movimientos_puntos WHERE id_cliente = ?", [id]
    );
    expect(mov).toHaveLength(1);
    expect(mov[0]).toMatchObject({ tipo: 'ganado', puntos: 50 });
  });

  it('aplica la bienvenida (elegida) solo en la primera compra', async () => {
    await setConfig('bienvenida_activo', '1');
    const id = await crearCliente({ puntos: 0 });

    // Primera compra ELIGIENDO la bienvenida: 10 base + 20 bienvenida, descuento 2.
    const primera = await post({ id_cliente: id, monto: 10, promocion: 'bienvenida' });
    expect(primera.body.puntos_otorgados).toBe(30);
    expect(primera.body.descuento_aplicado).toBe(2);

    // En la segunda compra la bienvenida ya no es válida: se rechaza (400).
    const segunda = await post({ id_cliente: id, monto: 10, promocion: 'bienvenida' });
    expect(segunda.status).toBe(400);

    // Sin elegirla, la compra otorga solo la base.
    const tercera = await post({ id_cliente: id, monto: 10 });
    expect(tercera.body.puntos_otorgados).toBe(10);

    expect(await puntosDe(id)).toBe(40); // 30 + 10 (la rechazada no suma)
  });

  it('NO aplica la bienvenida si no se elige, aunque sea la primera compra', async () => {
    await setConfig('bienvenida_activo', '1');
    const id = await crearCliente({ puntos: 0 });
    const res = await post({ id_cliente: id, monto: 10 }); // sin elegir promoción
    expect(res.body.puntos_otorgados).toBe(10); // solo base
    expect(res.body.descuento_aplicado).toBe(0);
  });

  it('suma los puntos extra de una promoción vigente ELEGIDA (fecha especial = hoy)', async () => {
    // Usamos CURDATE() de la propia BD para que "hoy" coincida exactamente con lo
    // que compara el backend (evita desfases por zona horaria entre Node y MySQL).
    const [r] = await pool.query(
      `INSERT INTO promociones (nombre, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
       VALUES ('Especial', CURDATE(), 25, 0, 1, 1)`
    );
    const idPromo = r.insertId;
    const id = await crearCliente({ puntos: 0 });

    const res = await post({ id_cliente: id, monto: 40, promocion: idPromo });
    expect(res.status).toBe(201);
    expect(res.body.puntos_otorgados).toBe(65); // 40 base + 25 promo
    expect(res.body.promocion).toBe('Especial');
  });

  it('rechaza una promoción NO vigente aunque se elija (400)', async () => {
    const [r] = await pool.query(
      `INSERT INTO promociones (nombre, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
       VALUES ('Vencida', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 25, 0, 1, 1)`
    );
    const idPromo = r.insertId;
    const id = await crearCliente({ puntos: 0 });

    const res = await post({ id_cliente: id, monto: 40, promocion: idPromo });
    expect(res.status).toBe(400);
    expect(await puntosDe(id)).toBe(0); // no se registró nada
  });
});

describe('POST /api/transacciones — canje de puntos', () => {
  it('canjea una recompensa: descuenta puntos y no otorga nuevos', async () => {
    const idRec = await crearRecompensa({ nombre: 'Pasanoche', puntos: 100 });
    const id = await crearCliente({ puntos: 150 });

    const res = await post({ id_cliente: id, monto: 80, id_recompensa: idRec });
    expect(res.status).toBe(201);
    expect(res.body.puntos_canjeados).toBe(100);
    expect(res.body.puntos_otorgados).toBe(0);
    expect(res.body.saldo_puntos).toBe(50); // 150 - 100
    expect(await puntosDe(id)).toBe(50);

    const [mov] = await pool.query(
      "SELECT tipo, puntos FROM movimientos_puntos WHERE id_cliente = ? AND tipo = 'canjeado'", [id]
    );
    expect(mov[0]).toMatchObject({ tipo: 'canjeado', puntos: -100 });
  });

  it('rechaza el canje si el cliente no tiene puntos suficientes (400)', async () => {
    const idRec = await crearRecompensa({ puntos: 700 });
    const id = await crearCliente({ puntos: 100 });
    const res = await post({ id_cliente: id, monto: 50, id_recompensa: idRec });
    expect(res.status).toBe(400);
    expect(await puntosDe(id)).toBe(100); // no se tocó el saldo
  });

  it('rechaza una recompensa inexistente/ inactiva (400)', async () => {
    const idRec = await crearRecompensa({ puntos: 100, activo: 0 });
    const id = await crearCliente({ puntos: 500 });
    const res = await post({ id_cliente: id, monto: 50, id_recompensa: idRec });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/transacciones — seguridad ante concurrencia (FOR UPDATE)', () => {
  it('dos canjes simultáneos NO dejan el saldo negativo: solo uno pasa', async () => {
    const idRec = await crearRecompensa({ puntos: 100 });
    const id = await crearCliente({ puntos: 100 }); // alcanza para UN solo canje

    // Se disparan a la vez: el bloqueo de fila debe serializarlos.
    const [a, b] = await Promise.all([
      post({ id_cliente: id, monto: 30, id_recompensa: idRec }),
      post({ id_cliente: id, monto: 30, id_recompensa: idRec }),
    ]);

    const estados = [a.status, b.status].sort();
    expect(estados).toEqual([201, 400]); // exactamente uno gana
    expect(await puntosDe(id)).toBe(0); // 100 - 100, nunca negativo
  });
});

describe('PUT /api/transacciones/:id — editar datos seguros', () => {
  it('actualiza folio y fechas SIN tocar puntos ni saldo', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 40 })).body.id_transaccion;
    expect(await puntosDe(id)).toBe(40);

    const res = await put(tid, {
      referencia_venta: 'F-999', fecha_ingreso: '2026-09-01', fecha_salida: '2026-09-03',
    });
    expect(res.status).toBe(200);

    const [rows] = await pool.query(
      'SELECT referencia_venta, puntos_otorgados FROM transacciones WHERE id_transaccion = ?', [tid]
    );
    expect(rows[0].referencia_venta).toBe('F-999');
    expect(rows[0].puntos_otorgados).toBe(40); // no se recalcularon
    expect(await puntosDe(id)).toBe(40);       // saldo intacto
  });

  it('404 si la transacción no existe', async () => {
    expect((await put(999999, { referencia_venta: 'X' })).status).toBe(404);
  });

  it('no permite editar una transacción anulada (400)', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 20 })).body.id_transaccion;
    await anular(tid, { motivo: 'prueba' });
    expect((await put(tid, { referencia_venta: 'Y' })).status).toBe(400);
  });
});

describe('PUT /api/transacciones/:id/anular — anular', () => {
  it('revierte los puntos otorgados, marca la transacción y deja el asiento de ajuste', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 50 })).body.id_transaccion;
    expect(await puntosDe(id)).toBe(50);

    const res = await anular(tid, { motivo: 'monto equivocado' });
    expect(res.status).toBe(200);
    expect(res.body.saldo_puntos).toBe(0);
    expect(await puntosDe(id)).toBe(0);

    const [rows] = await pool.query(
      'SELECT anulada, motivo_anulacion, anulada_por FROM transacciones WHERE id_transaccion = ?', [tid]
    );
    expect(rows[0].anulada).toBe(1);
    expect(rows[0].motivo_anulacion).toBe('monto equivocado');
    expect(rows[0].anulada_por).not.toBeNull();

    const [mov] = await pool.query(
      "SELECT tipo, puntos FROM movimientos_puntos WHERE id_transaccion = ? AND tipo = 'ajuste'", [tid]
    );
    expect(mov[0]).toMatchObject({ tipo: 'ajuste', puntos: -50 });
  });

  it('devuelve los puntos de un canje al anular', async () => {
    const idRec = await crearRecompensa({ puntos: 100 });
    const id = await crearCliente({ puntos: 150 });
    const tid = (await post({ id_cliente: id, monto: 80, id_recompensa: idRec })).body.id_transaccion;
    expect(await puntosDe(id)).toBe(50); // 150 - 100

    const res = await anular(tid, { motivo: 'canje equivocado' });
    expect(res.status).toBe(200);
    expect(res.body.saldo_puntos).toBe(150); // se devuelven los 100
    expect(await puntosDe(id)).toBe(150);
  });

  it('exige motivo (400)', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 20 })).body.id_transaccion;
    expect((await anular(tid, {})).status).toBe(400);
    expect(await puntosDe(id)).toBe(20); // no se tocó nada
  });

  it('no deja anular dos veces (400)', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 20 })).body.id_transaccion;
    expect((await anular(tid, { motivo: 'a' })).status).toBe(200);
    expect((await anular(tid, { motivo: 'b' })).status).toBe(400);
    expect(await puntosDe(id)).toBe(0); // revertido una sola vez
  });

  it('no anula si el cliente ya gastó esos puntos (saldo quedaría negativo)', async () => {
    const idRec = await crearRecompensa({ puntos: 100 });
    const id = await crearCliente({ puntos: 0 });
    // Gana 100 con la primera compra...
    const tid1 = (await post({ id_cliente: id, monto: 100 })).body.id_transaccion;
    // ...y los gasta en un canje (saldo queda en 0).
    await post({ id_cliente: id, monto: 30, id_recompensa: idRec });
    expect(await puntosDe(id)).toBe(0);

    // Anular la primera dejaría el saldo en -100: no se permite.
    const res = await anular(tid1, { motivo: 'ya no aplica' });
    expect(res.status).toBe(400);
    expect(await puntosDe(id)).toBe(0); // intacto
  });

  it('las transacciones anuladas no cuentan en el resumen del día', async () => {
    const id = await crearCliente({ puntos: 0 });
    const tid = (await post({ id_cliente: id, monto: 25 })).body.id_transaccion;
    await anular(tid, { motivo: 'prueba' });

    const res = await request(app)
      .get('/api/transacciones/resumen')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.transacciones_hoy).toBe(0);
    expect(res.body.ventas_hoy).toBe(0);
    expect(res.body.puntos_hoy).toBe(0);
  });
});

describe('Anular libera la bienvenida / promoción (regresión)', () => {
  it('tras anular la 1.ª compra, la bienvenida vuelve a aplicar en la nueva compra', async () => {
    await setConfig('bienvenida_activo', '1');
    const id = await crearCliente({ puntos: 0 });

    // 1.ª compra con bienvenida (30 pts: 10 base + 20 bienvenida).
    const primera = await post({ id_cliente: id, monto: 10, promocion: 'bienvenida' });
    expect(primera.body.puntos_otorgados).toBe(30);

    // El cajero se equivocó de monto → anula la transacción.
    expect((await anular(primera.body.id_transaccion, { motivo: 'monto equivocado' })).status).toBe(200);

    // Al re-registrar, la bienvenida DEBE poder aplicarse otra vez (antes daba 400).
    const nueva = await post({ id_cliente: id, monto: 10, promocion: 'bienvenida' });
    expect(nueva.status).toBe(201);
    expect(nueva.body.puntos_otorgados).toBe(30);
    expect(nueva.body.primera_compra).toBe(true);
    expect(await puntosDe(id)).toBe(30); // solo cuenta la nueva (la anulada no)
  });

  it('tras anular, una promoción de un solo uso vuelve a estar disponible', async () => {
    const [r] = await pool.query(
      `INSERT INTO promociones (nombre, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
       VALUES ('Especial', CURDATE(), 25, 0, 1, 1)`
    );
    const idPromo = r.insertId;
    const id = await crearCliente({ puntos: 0 });

    // Usa la promoción (único uso permitido).
    const primera = await post({ id_cliente: id, monto: 40, promocion: idPromo });
    expect(primera.body.puntos_otorgados).toBe(65); // 40 base + 25 promo

    // Se anula por error del cajero.
    expect((await anular(primera.body.id_transaccion, { motivo: 'error' })).status).toBe(200);

    // La promoción DEBE volver a aceptarse (antes daba 400 "máximo de usos").
    const nueva = await post({ id_cliente: id, monto: 40, promocion: idPromo });
    expect(nueva.status).toBe(201);
    expect(nueva.body.puntos_otorgados).toBe(65);
    expect(await puntosDe(id)).toBe(65);
  });
});

describe('GET /api/transacciones — historial', () => {
  it('lista las transacciones y expone el header de truncado', async () => {
    const id = await crearCliente({ numero_documento: 'HIST-1' });
    await post({ id_cliente: id, monto: 20 });
    await post({ id_cliente: id, monto: 35 });

    const res = await request(app)
      .get('/api/transacciones')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.headers['x-historial-truncado']).toBe('0');
  });

  it('filtra por número de documento', async () => {
    const idA = await crearCliente({ numero_documento: 'AAA-111' });
    const idB = await crearCliente({ numero_documento: 'BBB-222' });
    await post({ id_cliente: idA, monto: 10 });
    await post({ id_cliente: idB, monto: 10 });

    const res = await request(app)
      .get('/api/transacciones')
      .query({ numero_documento: 'AAA-111' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].numero_documento).toBe('AAA-111');
  });
});

describe('GET /api/transacciones/resumen — dashboard', () => {
  it('devuelve el conteo de clientes y la actividad del día', async () => {
    const id = await crearCliente();
    await post({ id_cliente: id, monto: 25 });

    const res = await request(app)
      .get('/api/transacciones/resumen')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.clientes_total).toBe(1);
    expect(res.body.transacciones_hoy).toBe(1);
    expect(res.body.ventas_hoy).toBe(25);
    expect(res.body.puntos_hoy).toBe(25);
  });
});
