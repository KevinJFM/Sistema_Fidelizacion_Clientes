import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/aplicacion.js';
import { limpiar, crearUsuarioConToken } from '../helpers/db.js';

let token;

beforeEach(async () => {
  await limpiar();
  ({ token } = await crearUsuarioConToken({ rol: 'admin' }));
});

const get = () =>
  request(app).get('/api/plantillas').set('Authorization', `Bearer ${token}`);
const put = (clave, body) =>
  request(app).put(`/api/plantillas/${clave}`).set('Authorization', `Bearer ${token}`).send(body);
const preview = (clave, body = {}) =>
  request(app).post(`/api/plantillas/${clave}/preview`).set('Authorization', `Bearer ${token}`).send(body);

describe('GET /api/plantillas', () => {
  it('lista las plantillas sembradas (incluye promociones)', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const claves = res.body.map((p) => p.clave);
    expect(claves).toEqual(expect.arrayContaining([
      'otp', 'cerca_canje', 'reactivacion', 'bienvenida', 'comprobante', 'promo_nueva', 'promo_por_finalizar',
    ]));
  });

  it('rechaza a un no-admin (403)', async () => {
    const { token: tokenRecep } = await crearUsuarioConToken({ rol: 'recepcionista' });
    const res = await request(app).get('/api/plantillas').set('Authorization', `Bearer ${tokenRecep}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/plantillas/:clave', () => {
  it('actualiza asunto y textos de una plantilla', async () => {
    const res = await put('cerca_canje', {
      activo: 1,
      asunto: 'Nuevo asunto {recompensa}',
      titulo: 'Hola {nombre}',
      intro: 'Te faltan {faltan}',
      cuerpo: 'Cuerpo nuevo',
      boton: 'Ir al portal',
    });
    expect(res.status).toBe(200);
    expect(res.body.asunto).toBe('Nuevo asunto {recompensa}');
    expect(res.body.titulo).toBe('Hola {nombre}');
  });

  it('no permite desactivar una plantilla obligatoria (otp)', async () => {
    const res = await put('otp', { activo: 0, asunto: 'Tu código', titulo: 'Código' });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(1); // forzada a activa por ser obligatoria
  });

  it('exige asunto y título (400)', async () => {
    const res = await put('reactivacion', { asunto: '', titulo: '' });
    expect(res.status).toBe(400);
  });

  it('404 si la plantilla no existe', async () => {
    const res = await put('no_existe', { asunto: 'x', titulo: 'y' });
    expect(res.status).toBe(404);
  });

  it('edita los días de antelación de promo_por_finalizar', async () => {
    const res = await put('promo_por_finalizar', { asunto: 'Últimos días', titulo: '¡Apúrate!', dias: 5 });
    expect(res.status).toBe(200);
    expect(res.body.dias).toBe(5);
  });

  it('rechaza días de antelación fuera de rango (400)', async () => {
    expect((await put('promo_por_finalizar', { asunto: 'a', titulo: 'b', dias: 0 })).status).toBe(400);
    expect((await put('promo_por_finalizar', { asunto: 'a', titulo: 'b', dias: 999 })).status).toBe(400);
  });
});

describe('POST /api/plantillas/:clave/preview', () => {
  it('renderiza con datos de ejemplo (sin enviar) e incrusta el logo', async () => {
    const res = await preview('cerca_canje');
    expect(res.status).toBe(200);
    expect(res.body.html).toContain('María');      // {nombre} de ejemplo
    expect(res.body.asunto).toContain('Pasanoche'); // {recompensa} de ejemplo
    expect(res.body.html).toContain('data:image/png'); // logo en línea para la vista previa
    expect(res.body.html).toContain('/login'); // el botón enlaza al portal
  });

  it('aplica los cambios sin guardar en la vista previa', async () => {
    const res = await preview('cerca_canje', { titulo: 'Hola {nombre}, mira esto' });
    expect(res.status).toBe(200);
    expect(res.body.html).toContain('Hola María, mira esto');
  });

  it('previsualiza el comprobante con el detalle financiero de ejemplo', async () => {
    const res = await preview('comprobante');
    expect(res.status).toBe(200);
    expect(res.body.html).toContain('95.00');        // monto de ejemplo
    expect(res.body.html).toContain('Puntos ganados');
    expect(res.body.asunto).toContain('comprobante');
  });

  it('previsualiza la bienvenida', async () => {
    const res = await preview('bienvenida');
    expect(res.status).toBe(200);
    expect(res.body.html).toContain('María');
    expect(res.body.asunto).toContain('Bienvenido');
  });

  it('previsualiza los correos de promoción con la promo de ejemplo', async () => {
    const nueva = await preview('promo_nueva');
    expect(nueva.status).toBe(200);
    expect(nueva.body.html).toContain('2x1 en Pasadía');

    const fin = await preview('promo_por_finalizar');
    expect(fin.status).toBe(200);
    expect(fin.body.html).toContain('días'); // "¡Quedan 2 días!"
  });

  it('la vista previa refleja los días de antelación sin guardar', async () => {
    const res = await preview('promo_por_finalizar', { dias: 7 });
    expect(res.status).toBe(200);
    expect(res.body.html).toContain('7'); // "¡Quedan 7 días!"
  });
});
