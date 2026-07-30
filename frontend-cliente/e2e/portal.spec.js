import { test, expect } from '@playwright/test';

// Datos sembrados por backend/test/helpers/seedE2E.js (CLIENTE_E2E).
const CLIENTE = {
  dui: '98765432-1',
  digitos: '987654321', // se escribe sin guion; el campo lo formatea solo
  codigo: '123456',
  nombre: 'Ana Cliente',
  puntos: '500',
};

// El correo está desactivado en E2E, así que interceptamos "solicitar-codigo"
// para que responda OK SIN regenerar el OTP: el código sembrado ('123456') sigue
// siendo válido y podemos completar el login real (verificar-codigo sí es real).
async function stubSolicitarCodigo(page) {
  await page.route('**/portal/solicitar-codigo', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'ok', minutos: 5 }),
    })
  );
}

test('login con código (OTP) y consulta de puntos', async ({ page }) => {
  await stubSolicitarCodigo(page);
  await page.goto('/login');

  // Paso 1: documento → enviar código.
  await page.getByPlaceholder('00000000-0').pressSequentially(CLIENTE.digitos);
  await expect(page.getByPlaceholder('00000000-0')).toHaveValue(CLIENTE.dui);
  await page.getByRole('button', { name: 'Enviar código' }).click();

  // Paso 2: aparece la pantalla del código.
  await expect(page.getByText('Ingresa el código')).toBeVisible();

  // Escribir el código sembrado → verifica automáticamente al completar 6 dígitos.
  await page.locator('.pt-codigo-input').pressSequentially(CLIENTE.codigo);

  // Entra: primera vez muestra la bienvenida.
  await expect(page).toHaveURL(/\/bienvenida/);
  await expect(page.getByText(/Te damos la bienvenida/i)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Portal → Mis puntos: se ven el nombre y el saldo del cliente.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.pt-nombre')).toContainText(CLIENTE.nombre);
  await expect(page.locator('.pt-puntos-num')).toHaveText(CLIENTE.puntos);
});

test('un código incorrecto NO inicia sesión', async ({ page }) => {
  await stubSolicitarCodigo(page);
  await page.goto('/login');

  await page.getByPlaceholder('00000000-0').pressSequentially(CLIENTE.digitos);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await expect(page.getByText('Ingresa el código')).toBeVisible();

  // Código equivocado → se queda en el login (no navega al portal).
  await page.locator('.pt-codigo-input').pressSequentially('000000');
  await expect(page.getByText('Ingresa el código')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
