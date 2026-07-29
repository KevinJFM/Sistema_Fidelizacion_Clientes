# Auditoría del Sistema de Fidelización — Sistema + App

> Auditoría técnica realizada desde cero (revisión de seguridad, correctitud y calidad).
> Fecha: 2026-07-29 · Rama: `main` · Alcance: backend, panel web, portal cliente y app móvil.

---

## 1. Resumen ejecutivo

El proyecto está en **muy buen estado**. Ya se aplicaron dos auditorías previas y se nota: la
autenticación, la autorización y el manejo de la base de datos siguen buenas prácticas. **No se
encontró ninguna vulnerabilidad crítica** (sin inyección SQL, sin fugas de token, sin rutas abiertas).

- **Hallazgos críticos:** 0
- **Hallazgos medios:** 2 (1 de código, 1 de despliegue)
- **Hallazgos bajos / mejoras:** 5
- **Pendientes de despliegue:** 3

El único punto de **código** que conviene corregir antes de la defensa es una posible **condición de
carrera al sumar/restar puntos** en el registro manual de transacciones. Lo demás son mejoras menores
y pasos normales de puesta en producción.

---

## 2. Lo que está BIEN ✅

### Seguridad (backend)
- **Tokens JWT bien manejados:** el *access token* vive **solo en memoria** (Redux), nunca en
  `localStorage` → resistente a XSS. El *refresh token* va en **cookie httpOnly** con **rotación** y
  **revocación** (se guarda solo el hash SHA-256 en la tabla `refresh_tokens`).
- **Rate limiting** en login (5 intentos / 15 min) y refresh (30 / 15 min).
- **Acceso del cliente por OTP** (portal/app): código de 6 dígitos con **hash bcrypt**, vigencia de
  5 min, máximo 5 intentos y **respuesta genérica** que no revela si el documento existe
  (anti-enumeración).
- **Autorización por roles consistente** en **todas** las rutas (`verificarToken` + `autorizarRoles`
  / `esAdmin`). No hay endpoints administrativos sin protección.
- **100 % consultas parametrizadas** (`?`) → sin inyección SQL. Donde hay columnas dinámicas
  (`sesion_app` / `sesion_portal`) se usa lista blanca, no interpolación del usuario.
- **Helmet + CSP estricta** y **CORS restringido** por `CLIENT_URL` (falla cerrado si no está
  configurado, no abre a todos).
- **Validación de variables de entorno críticas al arrancar** (falla temprano con mensaje claro).
- **Cifrado AES-256-GCM** de la contraseña del POS.
- **Sesión única por superficie** (app/portal) + **cierre remoto** de la otra sesión.

### Correctitud / datos
- **Transacciones de BD atómicas** (`beginTransaction`/`commit`/`rollback`) al otorgar y canjear puntos.
- **Borrado de usuario con guarda de FK:** conserva el historial (bitácora se desliga con
  `id_usuario = NULL`) y **bloquea** el borrado si tiene transacciones, sugiriendo desactivar.
- **Integración POS con candado anti-concurrencia** (`sincronizando`) y **cursor** para no re-escanear
  todo el POS cada 2 min; usa suma atómica de puntos (`puntos_acumulados + ?`).

### App móvil
- **Token en `SecureStore`** (almacenamiento cifrado del dispositivo), no en AsyncStorage.
- **Manejo de estado offline** con `NetInfo` (deshabilita cerrar sesión sin internet, con aviso claro).
- Interceptor 401 que limpia el token y avisa "iniciaste sesión en otro dispositivo".
- Notificaciones push funcionando (FCM V1) y tema claro/oscuro persistente.

---

## 3. Hallazgos a ARREGLAR 🔧

### 🟠 MEDIO-1 — Posible condición de carrera al actualizar puntos (registro manual) · ✅ RESUELTO
**Archivo:** `backend/src/controladores/transaccion.controlador.js` (`crearTransaccion`)
**Estado:** corregido — ahora se bloquea la fila del cliente con `SELECT … FOR UPDATE` dentro de la
transacción, se re-valida el canje contra el saldo bloqueado y se actualiza de forma **relativa**
(`SET puntos_acumulados = puntos_acumulados + ?`).
**Qué pasa:** el saldo se lee **fuera** de la transacción de BD (`SELECT * FROM clientes`, línea ~37),
el nuevo saldo se calcula en JavaScript y se escribe con **asignación absoluta**
(`SET puntos_acumulados = ?`, línea ~176). Si llegan **dos peticiones casi simultáneas** para el mismo
cliente (doble clic del cajero, o un registro manual coincidiendo con el poller del POS), ambas leen el
mismo saldo inicial y la segunda escritura **pisa** a la primera → se pierden puntos, o un canje se
podría gastar dos veces.
**Nota:** la ruta del POS ya lo hace bien (usa `+= puntos`). El riesgo real es bajo con un solo cajero,
pero es un defecto de correctitud que conviene cerrar antes de la defensa.
**Cómo arreglarlo:** hacer el `SELECT ... FOR UPDATE` del cliente **dentro** de la misma conexión/
transacción, o cambiar la escritura a **relativa** (`SET puntos_acumulados = puntos_acumulados + ? - ?`).

### 🟠 MEDIO-2 — App móvil apunta a IP local por HTTP (bloqueante de producción)
**Archivo:** `puntadiamantes-app/src/configuracion/configuracion.js`
**Qué pasa:** `URL_API = 'http://192.168.1.2:4000/api'` (además el comentario menciona otra IP,
`10.34.210.125` → dato desactualizado). Con `usesCleartextTraffic: true` en `app.json`. Sirve para
probar en la misma WiFi, pero **no** para producción: la IP cambia por DHCP y el tráfico va sin cifrar.
**Cómo arreglarlo (al desplegar):** apuntar al **dominio real HTTPS**, quitar `usesCleartextTraffic`
y generar el build `production`. (Ya está anotado como pendiente de despliegue.)

---

## 4. Mejoras menores (BAJO) 🔹

| # | Archivo | Detalle | Estado |
|---|---------|---------|--------|
| B-1 | `transaccion.controlador.js` (`listarTransacciones`) | Devolvía **todas** las filas sin paginar. | ✅ **Resuelto** — `LIMIT` solo defensivo y **muy alto** (50 000, máx. 100 000 vía `?limite=N`) para que la descarga CSV/PDF salga **completa** desde la primera transacción. |
| B-2 | `usuario.controlador.js` | `crearUsuario`/`actualizarUsuario` no validaban longitudes máximas. | ✅ **Resuelto** — helper `validarLongitudes` + máx. 72 en contraseña. |
| B-3 | `transaccion.controlador.js` (`crearTransaccion`) | ~6 lecturas de config **en serie**. | ✅ **Resuelto** — una sola query `WHERE clave IN (...)` (`obtenerConfigs`). |
| B-4 | `autenticacion.middleware.js` (`verificarToken`) | `split(' ')[1].trim()` implícito ante header mal formado. | ✅ **Resuelto** — valida `Bearer <token>` explícitamente. |
| B-5 | `configuracion.js` (app) | Comentario con IP desactualizada (`10.34.210.125` vs `192.168.1.2`). | ✅ **Resuelto** — se quitó la IP contradictoria; el comentario apunta a `URL_API` y menciona el dominio HTTPS para producción. |

---

## 5. Pendientes de despliegue (no son bugs) 🚀

1. **`POS_ENCRYPTION_KEY`**: si no se configura, la contraseña del POS se guarda en **texto plano**
   (con warning). En producción **debe** configurarse (está documentado en `.env.example`).
2. **App móvil → HTTPS**: ver MEDIO-2 (dominio real, quitar cleartext, build `production` para tienda).
3. **Usuario de BD con permisos mínimos**: el `.env.example` ya lo recomienda; confirmar que en
   producción **no** se usa `root`.

---

## 6. Conclusión

El sistema es **defendible tal como está**: la base de seguridad es sólida y las decisiones de diseño
(tokens en memoria, OTP con hash, autorización por rol, transacciones atómicas, cifrado del POS) son
las correctas. Con corregir **MEDIO-1** (concurrencia de puntos) y seguir la lista de despliegue,
queda listo para producción.
