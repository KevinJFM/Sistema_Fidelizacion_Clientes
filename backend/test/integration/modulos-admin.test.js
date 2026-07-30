import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import { limpiar, crearUsuarioConToken, crearRecompensa, crearPromocion } from '../helpers/db.js';

let adminToken;

beforeEach(async () => {
  await limpiar();
  ({ token: adminToken } = await crearUsuarioConToken({ rol: 'admin' }));
});

const admin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

// ============================================================
//  USUARIOS  (solo admin)
// ============================================================
describe('Usuarios /api/usuarios (solo admin)', () => {
  it('un recepcionista NO puede acceder (403)', async () => {
    const { token } = await crearUsuarioConToken({ email: 'recep_u@test.com', rol: 'recepcionista' });
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('crea un usuario válido (201)', async () => {
    const res = await admin(request(app).post('/api/usuarios')).send({
      nombre: 'Carlos', apellido: 'Reyes', email: 'carlos@test.com',
      contrasena: 'Clave1234', telefono: '70009999',
      id_rol: 2, id_departamento: 3, id_distrito: 33,
    });
    expect(res.status).toBe(201);
    expect(res.body.id_usuario).toBeTruthy();
  });

  it('rechaza contraseña que no cumple la política (400)', async () => {
    const res = await admin(request(app).post('/api/usuarios')).send({
      nombre: 'Débil', apellido: 'Clave', email: 'debil@test.com',
      contrasena: 'abc', telefono: '70009999',
      id_rol: 2, id_departamento: 3, id_distrito: 33,
    });
    expect(res.status).toBe(400);
  });

  it('rechaza email duplicado (409)', async () => {
    const { usuario } = await crearUsuarioConToken({ email: 'existente@test.com', rol: 'admin' });
    const res = await admin(request(app).post('/api/usuarios')).send({
      nombre: 'Otro', apellido: 'Igual', email: usuario.email,
      contrasena: 'Clave1234', telefono: '70009999',
      id_rol: 2, id_departamento: 3, id_distrito: 33,
    });
    expect(res.status).toBe(409);
  });
});

// ============================================================
//  RECOMPENSAS
// ============================================================
describe('Recompensas /api/recompensas', () => {
  it('lista solo las recompensas activas', async () => {
    await crearRecompensa({ nombre: 'Activa', puntos: 100, activo: 1 });
    await crearRecompensa({ nombre: 'Inactiva', puntos: 200, activo: 0 });
    const res = await admin(request(app).get('/api/recompensas'));
    expect(res.status).toBe(200);
    const nombres = res.body.map((r) => r.nombre);
    expect(nombres).toContain('Activa');
    expect(nombres).not.toContain('Inactiva');
    // Calcula el valor en $ (puntos * 0.05).
    const activa = res.body.find((r) => r.nombre === 'Activa');
    expect(activa.valor).toBeCloseTo(5, 5);
  });

  it('crea una recompensa (admin) y rechaza puntos inválidos', async () => {
    const ok = await admin(request(app).post('/api/recompensas')).send({ nombre: 'Nueva', puntos: 300 });
    expect(ok.status).toBe(201);

    const mal = await admin(request(app).post('/api/recompensas')).send({ nombre: 'Mala', puntos: 0 });
    expect(mal.status).toBe(400);
  });

  it('elimina una recompensa existente y 404 si no existe', async () => {
    const id = await crearRecompensa({ puntos: 100 });
    expect((await admin(request(app).delete(`/api/recompensas/${id}`))).status).toBe(200);
    expect((await admin(request(app).delete('/api/recompensas/999999'))).status).toBe(404);
  });
});

// ============================================================
//  PROMOCIONES  (solo admin)
// ============================================================
describe('Promociones /api/promociones (solo admin)', () => {
  it('crea una promoción con fecha especial (201)', async () => {
    const res = await admin(request(app).post('/api/promociones')).send({
      nombre: 'Día del Padre', fecha_especial: '2026-06-21', puntos_extra: 10, descuento_extra: 5,
    });
    expect(res.status).toBe(201);
    expect(res.body.id_escenario).toBeTruthy();
  });

  it('rechaza una promoción sin ninguna fecha (400)', async () => {
    const res = await admin(request(app).post('/api/promociones')).send({ nombre: 'Sin fecha' });
    expect(res.status).toBe(400);
  });

  it('activa/desactiva con el toggle', async () => {
    const id = await crearPromocion({ activo: 1 });
    const res = await admin(request(app).patch(`/api/promociones/${id}/toggle`));
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(0);
  });
});

// ============================================================
//  CONFIGURACIÓN  (solo admin)
// ============================================================
describe('Configuración /api/configuracion (solo admin)', () => {
  it('lista la configuración', async () => {
    const res = await admin(request(app).get('/api/configuracion'));
    expect(res.status).toBe(200);
    expect(res.body.some((c) => c.clave === 'bienvenida_puntos')).toBe(true);
  });

  it('actualiza valores', async () => {
    const res = await admin(request(app).put('/api/configuracion')).send({ bienvenida_puntos: '50' });
    expect(res.status).toBe(200);
    const lista = await admin(request(app).get('/api/configuracion'));
    const clave = lista.body.find((c) => c.clave === 'bienvenida_puntos');
    expect(clave.valor).toBe('50');
  });

  it('rechaza un cuerpo vacío (400)', async () => {
    const res = await admin(request(app).put('/api/configuracion')).send({});
    expect(res.status).toBe(400);
  });
});

// ============================================================
//  UBICACIONES  (admin y recepcionista)
// ============================================================
describe('Ubicaciones /api/ubicaciones', () => {
  it('lista los 14 departamentos', async () => {
    const res = await admin(request(app).get('/api/ubicaciones/departamentos'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(14);
  });

  it('lista los distritos de un departamento', async () => {
    const res = await admin(
      request(app).get('/api/ubicaciones/distritos').query({ id_departamento: 3 })
    );
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('400 si falta el id_departamento', async () => {
    const res = await admin(request(app).get('/api/ubicaciones/distritos'));
    expect(res.status).toBe(400);
  });
});
