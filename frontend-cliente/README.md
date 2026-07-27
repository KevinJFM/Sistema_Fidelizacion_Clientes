# Portal del Cliente — Fase 2 (Punta Diamantes)

App web (PWA) de **autoservicio del cliente** para el Sistema de Fidelización del Hotel Punta Diamantes.
El cliente entra con su **documento + un PIN** y consulta (solo lectura) sus **puntos**, cuánto valen en dinero y su **historial de movimientos**.

Es una **extensión (Fase 2)** del sistema existente: **reusa el mismo backend y la misma base de datos**. No es un proyecto independiente; solo es un frontend aparte que consume nuevos endpoints del backend.

---

## ¿Por qué una carpeta aparte?

El sistema tiene tres carpetas en el mismo repositorio:

```
sistema fidelizacion clientes/
├── backend/            API Node/Express + MySQL (compartida)
├── frontend/           Panel del personal (admin/recepción) — versión aprobada
└── frontend-cliente/   ESTE proyecto: portal del cliente (PWA)
```

- `frontend/` y `frontend-cliente/` son **dos apps Vite independientes** (cada una con sus dependencias y su build).
- Las **dos consumen el mismo `backend/`**, que a su vez usa **una sola base de datos** (por eso los puntos que registra recepción se ven al instante en el portal del cliente).

---

## Qué hace (alcance de esta fase)

- **Login del cliente**: tipo de documento (DUI/Pasaporte) + número + PIN de 4–6 dígitos.
  - Si el cliente **aún no tiene PIN**, el primero que ingrese **queda guardado** como su clave (primera vez).
- **Mis puntos**: saldo actual y su valor en dólares (regla fija: 1 punto = $0.05).
- **Recompensas**: catálogo con lo que ya puede canjear y cuántos puntos le faltan.
- **Historial**: últimos movimientos de puntos (ganados/canjeados/ajustes).

> El **canje NO se hace desde el portal** — sigue siendo en recepción. El portal es **solo consulta**, lo que reduce el riesgo.

---

## Backend que usa (ya incluido en `backend/`)

Nuevos archivos/rutas agregados en el backend (montados en `/api/portal`):

| Método | Ruta | Descripción | Protección |
|---|---|---|---|
| POST | `/api/portal/login` | Login por documento + PIN | Público (rate-limit) |
| GET | `/api/portal/mis-puntos` | Puntos, valor en $ y recompensas | JWT rol `cliente` |
| GET | `/api/portal/mis-movimientos` | Historial de puntos | JWT rol `cliente` |

- Controlador: `backend/src/controladores/portalCliente.controlador.js`
- Rutas: `backend/src/rutas/portalCliente.rutas.js`
- El token del cliente reusa los middlewares existentes (`verificarToken`, `autorizarRoles('cliente')`).

### Migración de base de datos (ejecutar una vez)

Agrega la columna donde se guarda el PIN (hasheado con bcrypt):

```sql
-- backend/src/semillas/migracion_cliente_pin.sql
ALTER TABLE clientes ADD COLUMN pin_hash VARCHAR(255) NULL AFTER puntos_acumulados;
```

---

## Cómo correrlo en desarrollo

1. **Backend** (desde `backend/`): correr como siempre. Asegúrate de que en su `.env` la variable `CLIENT_URL` incluya el origen del portal. Ahora acepta **varias URLs separadas por coma**:

   ```env
   CLIENT_URL=http://localhost:5173,http://localhost:5174
   ```

2. **Portal del cliente** (desde `frontend-cliente/`):

   ```bash
   pnpm install
   cp .env.example .env      # ajusta VITE_API_URL si hace falta
   pnpm dev                  # arranca en http://localhost:5174
   ```

El panel del personal sigue en `http://localhost:5173` y el portal del cliente en `http://localhost:5174`, ambos contra el mismo backend (`http://localhost:4000/api`).

---

## Despliegue (Hostinger)

- `frontend-cliente/` se compila con `pnpm build` → se sube la carpeta `dist/` al subdominio **`puntos.puntadiamantes.com`**.
- El backend es el mismo de siempre; solo hay que agregar el origen del portal a `CLIENT_URL`.
- Es una **PWA básica**: incluye `manifest.webmanifest` e íconos, así el cliente puede **"Agregar a pantalla de inicio"** y usarla como app. (Un service worker para uso offline completo queda como mejora futura.)

---

## Notas de seguridad (importante para la tesis)

- El PIN se guarda **hasheado con bcrypt**, nunca en texto plano.
- El login tiene **límite de intentos** (rate-limit) igual que el del personal.
- El portal es **solo lectura**: no permite canjear ni modificar nada.
- **Consideración**: hoy la "primera vez" cualquiera que sepa el documento del cliente podría fijar el PIN. Para producción se recomienda que **recepción asigne/entregue el PIN**, o migrar a **código OTP por WhatsApp/correo** (Fase 3).

---

## Estado

Fase 2 en desarrollo, en la rama `feature/portal-cliente`. La versión aprobada por el hotel está protegida en el tag `v1-aprobado`.
