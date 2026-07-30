# Pruebas E2E del portal del cliente — Playwright

Pruebas de extremo a extremo del **portal de autoservicio** (Fase 2): manejan un
navegador real (Chromium) simulando a un cliente consultando sus puntos.

## Cómo correr

Desde la carpeta `frontend-cliente/`:

```bash
pnpm test:e2e          # corre las pruebas E2E (headless)
pnpm test:e2e:ui       # modo interactivo
pnpm test:e2e:report   # abre el último reporte HTML
```

(El navegador Chromium ya se instala una sola vez por máquina con
`pnpm exec playwright install chromium` desde cualquiera de los frontends.)

## Qué prueba

`e2e/portal.spec.js`:

1. **Login con código (OTP) + ver puntos:** el cliente ingresa su documento,
   recibe la pantalla del código, escribe el código y entra; luego se verifican
   su nombre y su saldo de puntos.
2. **Código incorrecto NO inicia sesión:** con un código equivocado se queda en
   el login.

### Sobre el código OTP en las pruebas

El portal entra con un **código de un solo uso enviado por correo**. En pruebas
NO se envían correos reales (el backend E2E corre sin credenciales de correo).
Para poder completar el login:

- El backend se siembra con un cliente que tiene un **código OTP conocido**
  (`123456`, ver `backend/test/helpers/seedE2E.js` → `CLIENTE_E2E`).
- La prueba **intercepta** la llamada de "solicitar código" (que normalmente
  generaría un código nuevo y aleatorio) para que el código sembrado siga siendo
  válido. La verificación del código (`verificar-codigo`) SÍ pega al backend real.

## Entorno aislado

Igual que la E2E del panel, Playwright levanta el stack y usa puertos/BD
separados (ver `playwright.config.js`):

| Componente   | Desarrollo        | E2E                       |
|--------------|-------------------|---------------------------|
| Backend      | 4000              | **4100**                  |
| Portal       | 5174              | **5198** (`--mode e2e`)   |
| Base de datos| `db_fidelizacion` | **`db_fidelizacion_e2e`** |

**Requisitos:** MySQL local corriendo. **No** se toca la BD de desarrollo.
