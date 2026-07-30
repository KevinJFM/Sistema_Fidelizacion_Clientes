import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import {
  pool, limpiar, crearCliente, crearRecompensa,
  setOtpCliente, crearSesionCliente,
} from '../helpers/db.js';

// Cliente de fidelización de prueba (documento tipo DUI = 1).
const DOC = { tipo_documento: 'DUI', numero_documento: '98765432-1' };

beforeEach(async () => {
  await limpiar();
});

async function clienteActivo(extra = {}) {
  return crearCliente({
    id_tipo_documento: 1,
    numero_documento: DOC.numero_documento,
    nombres: 'Ana',
    apellidos: 'Cliente',
    correo: 'ana@test.com',
    ...extra,
  });
}

// ============================================================
//  PASO 1 — Solicitar código (OTP por correo)
// ============================================================
describe('POST /api/portal/solicitar-codigo', () => {
  it('a un cliente activo con correo le genera un código (respuesta genérica)', async () => {
    const id = await clienteActivo();
    const res = await request(app).post('/api/portal/solicitar-codigo').send(DOC);

    expect(res.status).toBe(200);
    // El código se guarda hasheado en la BD (nunca se devuelve en la respuesta).
    const [filas] = await pool.query('SELECT otp_hash, otp_expira FROM clientes WHERE id_cliente = ?', [id]);
    expect(filas[0].otp_hash).toBeTruthy();
    expect(filas[0].otp_expira).toBeTruthy();
    expect(res.body.codigo).toBeUndefined();
  });

  it('con un documento inexistente responde igual (200 genérico, sin filtrar)', async () => {
    const res = await request(app)
      .post('/api/portal/solicitar-codigo')
      .send({ tipo_documento: 'DUI', numero_documento: '00000000-0' });
    expect(res.status).toBe(200); // no revela si existe o no
  });

  it('rechaza si faltan datos (400)', async () => {
    const res = await request(app).post('/api/portal/solicitar-codigo').send({ tipo_documento: 'DUI' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
//  PASO 2 — Verificar código
// ============================================================
describe('POST /api/portal/verificar-codigo', () => {
  it('con el código correcto entrega un token', async () => {
    const id = await clienteActivo();
    await setOtpCliente(id, '123456');

    const res = await request(app)
      .post('/api/portal/verificar-codigo')
      .send({ ...DOC, codigo: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.cliente).toMatchObject({ nombres: 'Ana', apellidos: 'Cliente' });

    // El código se consume (un solo uso) y se abre la sesión del portal.
    const [filas] = await pool.query('SELECT otp_hash, sesion_portal FROM clientes WHERE id_cliente = ?', [id]);
    expect(filas[0].otp_hash).toBeNull();
    expect(filas[0].sesion_portal).toBeTruthy();
  });

  it('con un código incorrecto responde 401 y cuenta el intento', async () => {
    const id = await clienteActivo();
    await setOtpCliente(id, '123456');

    const res = await request(app)
      .post('/api/portal/verificar-codigo')
      .send({ ...DOC, codigo: '000000' });

    expect(res.status).toBe(401);
    const [filas] = await pool.query('SELECT otp_intentos FROM clientes WHERE id_cliente = ?', [id]);
    expect(filas[0].otp_intentos).toBe(1);
  });

  it('si no se solicitó código antes responde 400', async () => {
    await clienteActivo();
    const res = await request(app).post('/api/portal/verificar-codigo').send({ ...DOC, codigo: '123456' });
    expect(res.status).toBe(400);
  });

  it('con el código vencido responde 400', async () => {
    const id = await clienteActivo();
    await setOtpCliente(id, '123456', { minutos: -1 }); // ya expirado
    const res = await request(app).post('/api/portal/verificar-codigo').send({ ...DOC, codigo: '123456' });
    expect(res.status).toBe(400);
  });

  it('tras demasiados intentos responde 429', async () => {
    const id = await clienteActivo();
    await setOtpCliente(id, '123456', { intentos: 5 });
    const res = await request(app).post('/api/portal/verificar-codigo').send({ ...DOC, codigo: '123456' });
    expect(res.status).toBe(429);
  });

  it('un cliente inactivo no puede entrar (403)', async () => {
    const id = await clienteActivo({ estado: 2 });
    await setOtpCliente(id, '123456');
    const res = await request(app).post('/api/portal/verificar-codigo').send({ ...DOC, codigo: '123456' });
    expect(res.status).toBe(403);
  });

  it('documento no encontrado responde 404', async () => {
    const res = await request(app)
      .post('/api/portal/verificar-codigo')
      .send({ tipo_documento: 'DUI', numero_documento: '11111111-1', codigo: '123456' });
    expect(res.status).toBe(404);
  });
});

// ============================================================
//  Endpoints protegidos (rol 'cliente' + sesión vigente)
// ============================================================
describe('GET /api/portal/mis-puntos', () => {
  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/portal/mis-puntos');
    expect(res.status).toBe(401);
  });

  it('con sesión válida devuelve puntos, valor en dinero y recompensas', async () => {
    const id = await clienteActivo({ puntos: 500 });
    await crearRecompensa({ nombre: 'Pasanoche', puntos: 700 });
    await crearRecompensa({ nombre: 'Café gratis', puntos: 100 });
    const { token } = await crearSesionCliente({ id_cliente: id, documento: DOC.numero_documento });

    const res = await request(app).get('/api/portal/mis-puntos').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.puntos_acumulados).toBe(500);
    expect(res.body.valor_en_dinero).toBeCloseTo(25, 5); // 500 * 0.05
    // La recompensa de 100 pts es alcanzable con 500; la de 700 no.
    const cafe = res.body.recompensas.find((r) => r.nombre === 'Café gratis');
    const noche = res.body.recompensas.find((r) => r.nombre === 'Pasanoche');
    expect(cafe.alcanzable).toBe(true);
    expect(noche.alcanzable).toBe(false);
    expect(noche.faltan).toBe(200);
  });

  it('sesión única por superficie: un token con sesión desfasada responde 401', async () => {
    const id = await clienteActivo();
    const { token } = await crearSesionCliente({ id_cliente: id, documento: DOC.numero_documento });
    // Otro dispositivo del portal inicia sesión → cambia el sid guardado.
    await crearSesionCliente({ id_cliente: id, documento: DOC.numero_documento });

    const res = await request(app).get('/api/portal/mis-puntos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401); // el token viejo ya no vale
  });
});

describe('GET /api/portal/mis-movimientos', () => {
  it('devuelve el historial de movimientos del cliente', async () => {
    const id = await clienteActivo({ puntos: 50 });
    await pool.query(
      "INSERT INTO movimientos_puntos (id_cliente, tipo, puntos, descripcion) VALUES (?, 'ganado', 50, 'Puntos por transacción')",
      [id]
    );
    const { token } = await crearSesionCliente({ id_cliente: id, documento: DOC.numero_documento });

    const res = await request(app).get('/api/portal/mis-movimientos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ tipo: 'ganado', puntos: 50 });
  });
});
