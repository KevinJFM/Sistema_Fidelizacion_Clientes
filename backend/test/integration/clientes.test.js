import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import { pool, limpiar, crearUsuarioConToken, crearCliente } from '../helpers/db.js';

let token; // token de un admin para autenticar las peticiones

beforeEach(async () => {
  await limpiar();
  ({ token } = await crearUsuarioConToken({ rol: 'admin' }));
});

const auth = (req) => req.set('Authorization', `Bearer ${token}`);

describe('Clientes — protección de rutas', () => {
  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/clientes (crear)', () => {
  it('crea un cliente con datos válidos', async () => {
    const res = await auth(request(app).post('/api/clientes')).send({
      id_tipo_documento: 1,
      numero_documento: '01234567-8',
      nombres: 'María',
      apellidos: 'López',
      telefono: '70001111',
      correo: 'maria@test.com',
      id_departamento: 3,
      id_distrito: 33, // Sonsonate (existe en el catálogo)
    });
    expect(res.status).toBe(201);
    expect(res.body.id_cliente).toBeTruthy();

    const [filas] = await pool.query(
      'SELECT puntos_acumulados, id_estado FROM clientes WHERE id_cliente = ?',
      [res.body.id_cliente]
    );
    expect(filas[0].puntos_acumulados).toBe(0); // nace con 0 puntos
    expect(filas[0].id_estado).toBe(1); // activo
  });

  it('rechaza campos obligatorios faltantes (400)', async () => {
    const res = await auth(request(app).post('/api/clientes')).send({
      id_tipo_documento: 1,
      numero_documento: '99999999-9',
      // faltan nombres, apellidos, departamento, distrito
    });
    expect(res.status).toBe(400);
  });

  it('rechaza correo con formato inválido (400)', async () => {
    const res = await auth(request(app).post('/api/clientes')).send({
      id_tipo_documento: 1, numero_documento: '11111111-1',
      nombres: 'Ana', apellidos: 'Gómez', correo: 'correo-malo',
      id_departamento: 3, id_distrito: 33,
    });
    expect(res.status).toBe(400);
  });

  it('rechaza documento duplicado (409)', async () => {
    const datos = {
      id_tipo_documento: 1, numero_documento: '22222222-2',
      nombres: 'Luis', apellidos: 'Martínez', id_departamento: 3, id_distrito: 33,
    };
    await auth(request(app).post('/api/clientes')).send(datos);
    const res = await auth(request(app).post('/api/clientes')).send(datos);
    expect(res.status).toBe(409);
  });
});

describe('GET /api/clientes/buscar (por documento)', () => {
  it('encuentra un cliente existente', async () => {
    await crearCliente({ id_tipo_documento: 1, numero_documento: 'DOC-BUSCA', nombres: 'Pedro' });
    const res = await auth(
      request(app).get('/api/clientes/buscar').query({ id_tipo_documento: 1, numero_documento: 'DOC-BUSCA' })
    );
    expect(res.status).toBe(200);
    expect(res.body.nombres).toBe('Pedro');
  });

  it('devuelve 404 si no existe', async () => {
    const res = await auth(
      request(app).get('/api/clientes/buscar').query({ id_tipo_documento: 1, numero_documento: 'NO-EXISTE' })
    );
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/clientes/:id (actualizar)', () => {
  it('actualiza los datos de un cliente', async () => {
    const id = await crearCliente({ numero_documento: 'DOC-UPD', nombres: 'Original' });
    const res = await auth(request(app).put(`/api/clientes/${id}`)).send({
      id_tipo_documento: 1, numero_documento: 'DOC-UPD', nombres: 'Editado',
      apellidos: 'Nuevo', id_estado: 1,
    });
    expect(res.status).toBe(200);
    const [filas] = await pool.query('SELECT nombres FROM clientes WHERE id_cliente = ?', [id]);
    expect(filas[0].nombres).toBe('Editado');
  });

  it('404 al actualizar un cliente inexistente', async () => {
    const res = await auth(request(app).put('/api/clientes/999999')).send({
      id_tipo_documento: 1, numero_documento: 'X', nombres: 'A', apellidos: 'B', id_estado: 1,
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/clientes/:id (borrado lógico)', () => {
  it('desactiva el cliente (id_estado = 2) sin borrarlo', async () => {
    const id = await crearCliente({ numero_documento: 'DOC-DEL' });
    const res = await auth(request(app).delete(`/api/clientes/${id}`));
    expect(res.status).toBe(200);
    const [filas] = await pool.query('SELECT id_estado FROM clientes WHERE id_cliente = ?', [id]);
    expect(filas[0].id_estado).toBe(2); // inactivo, sigue existiendo
  });
});
