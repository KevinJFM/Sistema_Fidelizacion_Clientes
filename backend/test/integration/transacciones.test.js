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

  it('aplica la bienvenida solo en la primera compra', async () => {
    await setConfig('bienvenida_activo', '1');
    const id = await crearCliente({ puntos: 0 });

    const primera = await post({ id_cliente: id, monto: 10 });
    expect(primera.body.puntos_otorgados).toBe(30); // 10 base + 20 bienvenida
    expect(primera.body.descuento_aplicado).toBe(2);
    expect(primera.body.primera_compra).toBe(true);

    const segunda = await post({ id_cliente: id, monto: 10 });
    expect(segunda.body.puntos_otorgados).toBe(10); // ya no hay bienvenida
    expect(segunda.body.primera_compra).toBe(false);

    expect(await puntosDe(id)).toBe(40); // 30 + 10
  });

  it('suma los puntos extra de una promoción vigente (fecha especial = hoy)', async () => {
    // Usamos CURDATE() de la propia BD para que "hoy" coincida exactamente con lo
    // que compara el backend (evita desfases por zona horaria entre Node y MySQL).
    await pool.query(
      `INSERT INTO promociones (nombre, fecha_especial, puntos_extra, descuento_extra, max_usos_cliente, activo)
       VALUES ('Especial', CURDATE(), 25, 0, 1, 1)`
    );
    const id = await crearCliente({ puntos: 0 });

    const res = await post({ id_cliente: id, monto: 40 });
    expect(res.status).toBe(201);
    expect(res.body.puntos_otorgados).toBe(65); // 40 base + 25 promo
    expect(res.body.promocion).toBe('Especial');
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
