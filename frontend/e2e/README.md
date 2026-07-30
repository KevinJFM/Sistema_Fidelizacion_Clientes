# Pruebas E2E del panel — Playwright

Pruebas de extremo a extremo (End-to-End) que manejan un **navegador real**
(Chromium) simulando lo que hace un usuario en el panel de administración.

## Cómo correr

Desde la carpeta `frontend/`:

```bash
pnpm test:e2e          # corre las pruebas E2E (headless)
pnpm test:e2e:ui       # modo interactivo con la UI de Playwright
pnpm test:e2e:report   # abre el último reporte HTML
```

La primera vez hay que instalar el navegador (una sola vez por máquina):

```bash
pnpm exec playwright install chromium
```

## Qué prueba

`e2e/panel.spec.js` cubre:

1. **Login inválido** → muestra el mensaje de error y no entra al panel.
2. **Flujo completo** simulando al recepcionista/admin:
   `login → registrar cliente → registrar transacción → ver el historial`,
   verificando que el cliente aparece, que la transacción otorga los puntos
   correctos (1 punto por $1) y que la transacción sale en el historial.

## Cómo funciona (entorno aislado)

Playwright levanta **todo el stack** automáticamente antes de las pruebas y lo
apaga al terminar (ver `playwright.config.js` → `webServer`). Usa **puertos y
base de datos separados** para no chocar con el entorno de desarrollo:

| Componente   | Desarrollo            | E2E                        |
|--------------|-----------------------|----------------------------|
| Backend      | puerto 4000           | puerto **4100**            |
| Frontend     | puerto 5173           | puerto **5199** (`--mode e2e`) |
| Base de datos| `db_fidelizacion`     | **`db_fidelizacion_e2e`**  |

- El backend E2E se siembra en limpio con `backend/test/helpers/seedE2E.js`
  (crea `db_fidelizacion_e2e` desde el esquema real + un usuario admin:
  `admin@e2e.com` / `Password123`).
- El frontend usa `frontend/.env.e2e` para apuntar al backend del puerto 4100.
- **No se toca la base de datos de desarrollo `db_fidelizacion`.**

**Requisitos:** MySQL local corriendo (mismas credenciales del `backend/.env`).

## Artefactos

Al fallar, Playwright guarda captura de pantalla y traza en `test-results/`
y un reporte navegable en `playwright-report/` (ambos ignorados por git).
