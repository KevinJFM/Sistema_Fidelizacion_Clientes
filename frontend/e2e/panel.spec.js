import { test, expect } from '@playwright/test';

// Credenciales del admin sembrado por backend/test/helpers/seedE2E.js
const ADMIN = { email: 'admin@e2e.com', contrasena: 'Password123' };

// Datos del cliente de prueba (la BD nace en limpio en cada corrida).
const CLIENTE = {
  dui: '12345678-9',
  nombres: 'Carlos',
  apellidos: 'Reyes',
};

// Inicia sesión en el panel y espera a estar dentro de /admin.
async function iniciarSesion(page) {
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN.email);
  await page.locator('#contrasena').fill(ADMIN.contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test('login inválido muestra un mensaje de error', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill(ADMIN.email);
  await page.locator('#contrasena').fill('claveIncorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Sigue en el login y aparece el error (no navega a /admin).
  await expect(page.locator('.login-error')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('flujo completo: login → registrar cliente → registrar transacción → ver historial', async ({ page }) => {
  // 1) LOGIN
  await iniciarSesion(page);

  // 2) REGISTRAR CLIENTE
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();

  await modal.locator('input[name="numero_documento"]').fill(CLIENTE.dui);
  await modal.locator('input[name="nombres"]').fill(CLIENTE.nombres);
  await modal.locator('input[name="apellidos"]').fill(CLIENTE.apellidos);

  // Departamento (2.º select del modal) → carga los distritos de forma asíncrona.
  await modal.locator('select').nth(1).selectOption({ label: 'Sonsonate' });
  const distrito = modal.locator('select').nth(2);
  await expect.poll(async () => distrito.locator('option').count()).toBeGreaterThan(1);
  await distrito.selectOption({ index: 1 });

  await modal.getByRole('button', { name: 'Registrar cliente' }).click();

  // El modal se cierra y el cliente aparece en la tabla.
  await expect(modal).toBeHidden();
  const filaCliente = page.locator('tr', { hasText: CLIENTE.dui });
  await expect(filaCliente).toContainText(`${CLIENTE.nombres} ${CLIENTE.apellidos}`);
  await expect(filaCliente).toContainText('0'); // nace con 0 puntos

  // 3) REGISTRAR TRANSACCIÓN
  await page.getByRole('link', { name: 'Transacciones', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar transacción' })).toBeVisible();

  // El campo reformatea el DUI en cada tecla (formatDui), así que escribimos
  // dígito por dígito para que el onChange de React reciba cada cambio.
  const inputBuscar = page.getByPlaceholder('12345678-9');
  await inputBuscar.click();
  await inputBuscar.pressSequentially('123456789');
  await expect(inputBuscar).toHaveValue(CLIENTE.dui); // quedó '12345678-9'
  await page.getByRole('button', { name: 'Buscar' }).click();

  // Aparece la tarjeta del cliente encontrado.
  await expect(page.locator('.cliente-card')).toContainText(`${CLIENTE.nombres} ${CLIENTE.apellidos}`);

  // Monto de $50 → 50 puntos (regla 1 punto por $1).
  await page.getByRole('spinbutton').fill('50');
  await page.getByRole('button', { name: 'Registrar transacción' }).click();

  // El resultado confirma los puntos otorgados y el saldo.
  const resultado = page.locator('.resultado-card');
  await expect(resultado).toBeVisible();
  await expect(resultado).toContainText('+50'); // puntos base
  await expect(resultado).toContainText('Saldo de puntos');

  // 4) VER HISTORIAL
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Historial de transacciones' })).toBeVisible();

  // La transacción recién creada aparece con su documento, monto y puntos.
  const filaHistorial = page.locator('tr', { hasText: CLIENTE.dui });
  await expect(filaHistorial).toContainText('$50.00');
  await expect(filaHistorial).toContainText('+50');
});
