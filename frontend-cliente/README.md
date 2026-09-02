# Portal del Cliente (PWA) — Punta Diamantes

App web de **autoservicio del cliente** construida con **React + Vite**, instalable como **PWA**. El cliente entra con su **documento + un código de acceso (OTP) enviado a su correo** y consulta (**solo lectura**) sus **puntos**, cuánto valen en dinero, las **promociones** vigentes y su **historial de movimientos**. El canje se sigue haciendo en recepción, no aquí.

Es una **app aparte** que **reusa el mismo `../backend` y la misma base de datos** que el panel; por eso los puntos que registra recepción se ven al instante en el portal.

> **Despliegue MANUAL:** `pnpm build` → subir la carpeta `dist/` al subdominio **`puntos.puntadiamantes.com`**. En producción apunta al backend vía `VITE_API_URL` (`.env.production` → `https://puntadiamantes.com/api`).

```bash
pnpm install
cp .env.example .env      # ajusta VITE_API_URL si hace falta
pnpm dev                  # Vite en http://localhost:5174
```

El backend debe incluir el origen del portal en `CLIENT_URL` (acepta varias URLs separadas por coma).

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo (Vite). |
| `pnpm build` | Compila a `dist/` (lo que se sube al hosting). |
| `pnpm preview` | Previsualiza el build. |
| `pnpm test:e2e` | Pruebas end-to-end (Playwright). |

## Estructura

```
frontend-cliente/
├── index.html               Entrada de Vite
├── vite.config.js           Config de Vite
├── playwright.config.js      Config de las pruebas E2E
├── .env* (.env, .example,    Variables VITE_API_URL por entorno
│         .production, .e2e)
│
├── e2e/                      Pruebas end-to-end del portal (Playwright)
│   └── portal.spec.js
│
├── public/                  Estáticos servidos tal cual
│   ├── manifest.webmanifest  Manifiesto PWA ("Agregar a pantalla de inicio")
│   ├── icono.svg             Ícono de la app instalada
│   ├── favicon.svg
│   └── .htaccess             Reescritura SPA en Hostinger (Apache)
│
└── src/
    ├── main.jsx             Bootstrap de React (Router)
    ├── App.jsx              Definición de rutas del portal
    │
    ├── api/
    │   └── api.js           axios: baseURL adaptativa + token del cliente (portal_token) y 401
    │
    ├── componentes/
    │   ├── Logo.jsx                  Logo de marca
    │   ├── Avisos.jsx                Avisos al usuario (ej. sin conexión)
    │   └── CampanaNotificaciones.jsx Campana con novedades (ej. promoción nueva)
    │
    ├── paginas/
    │   ├── Login.jsx        Acceso: documento + código OTP por correo
    │   ├── Portal.jsx       Layout/navegación una vez dentro
    │   ├── MisPuntos.jsx    Saldo, valor en $ y recompensas alcanzables
    │   ├── Promociones.jsx  Promociones vigentes
    │   ├── Configuracion.jsx Tema (claro/oscuro) y cerrar sesión
    │   └── Bienvenida.jsx   Pantalla inicial / presentación
    │
    ├── servicios/
    │   └── servicioPortal.js  Llamadas a /api/portal (solicitar/verificar código, puntos, movimientos)
    │
    ├── tema/
    │   └── tema.jsx         Proveedor y alternador de tema claro/oscuro
    │
    ├── estilos/
    │   └── portal.css       Estilos del portal
    │
    └── utilidades/
        └── formato.js       Formateo de documento, fechas, etc.
```

## Endpoints del backend que consume (montados en `/api/portal`)

| Método | Ruta | Descripción | Protección |
|---|---|---|---|
| POST | `/api/portal/solicitar-codigo` | Envía el OTP al correo del cliente | Público (rate-limit) |
| POST | `/api/portal/verificar-codigo` | Valida el OTP y entrega el token | Público (rate-limit) |
| GET | `/api/portal/mis-puntos` | Puntos, valor en $ y recompensas | JWT rol `cliente` |
| GET | `/api/portal/mis-movimientos` | Historial de puntos | JWT rol `cliente` |
| GET | `/api/portal/promociones` | Promociones vigentes | JWT rol `cliente` |

- Controlador: `../backend/src/controladores/portalCliente.controlador.js`
- Rutas: `../backend/src/rutas/portalCliente.rutas.js`

## Notas

- **Solo lectura:** el portal no canjea ni modifica nada — reduce el riesgo.
- **Acceso por OTP** (no por PIN): un código de 6 dígitos con vigencia corta enviado al correo; la sesión del portal es independiente de la de la app móvil.
- **PWA:** con `manifest.webmanifest` e íconos, el cliente puede instalarla en su teléfono.
