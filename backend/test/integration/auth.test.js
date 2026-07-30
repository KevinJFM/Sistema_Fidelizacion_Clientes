import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import { limpiar, crearUsuario, crearUsuarioConToken } from '../helpers/db.js';

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await limpiar();
  });

  it('inicia sesión con credenciales correctas y devuelve token', async () => {
    await crearUsuario({ email: 'recep@test.com', contrasena: 'Clave123', rol: 'recepcionista' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'recep@test.com', contrasena: 'Clave123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario).toMatchObject({ email: 'recep@test.com', rol: 'recepcionista' });
    // La contraseña / hash NUNCA se filtran al cliente.
    expect(res.body.usuario.contrasena_hash).toBeUndefined();
    // Debe emitir la cookie httpOnly del refresh token.
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rechaza cuando faltan campos (400)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });

  it('rechaza contraseña incorrecta (401)', async () => {
    await crearUsuario({ email: 'admin@test.com', contrasena: 'Correcta1' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', contrasena: 'Incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rechaza usuario inactivo (403)', async () => {
    await crearUsuario({ email: 'inactivo@test.com', contrasena: 'Clave123', estado: 2 });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inactivo@test.com', contrasena: 'Clave123' });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/register (solo admin)', () => {
  beforeEach(async () => {
    await limpiar();
  });

  it('un admin puede registrar un nuevo usuario', async () => {
    const { token } = await crearUsuarioConToken({ email: 'jefe@test.com', rol: 'admin' });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Nuevo', apellido: 'Empleado', email: 'nuevo@test.com',
        contrasena: 'Clave1234', telefono: '77778888',
        fecha_nacimiento: '1998-05-10', id_rol: 3,
      });

    expect(res.status).toBe(201);
  });

  it('sin token responde 401', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(401);
  });

  it('un rol no admin responde 403', async () => {
    const { token } = await crearUsuarioConToken({ email: 'recep2@test.com', rol: 'recepcionista' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'X', apellido: 'Y', email: 'z@test.com',
        contrasena: 'Clave1234', telefono: '77778888', fecha_nacimiento: '1998-05-10',
      });
    expect(res.status).toBe(403);
  });

  it('rechaza email duplicado (409)', async () => {
    const { token, usuario } = await crearUsuarioConToken({ email: 'dup@test.com', rol: 'admin' });
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Otro', apellido: 'Igual', email: usuario.email,
        contrasena: 'Clave1234', telefono: '77778888', fecha_nacimiento: '1998-05-10',
      });
    expect(res.status).toBe(409);
  });
});
