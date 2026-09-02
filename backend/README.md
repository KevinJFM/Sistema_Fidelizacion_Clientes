# Backend — Sistema de Fidelización de Clientes

API REST del sistema, construida con **Node.js + Express + MySQL** (`mysql2`). Sirve a dos frontends que comparten la misma base de datos: el **panel del personal** (`../frontend`) y el **portal del cliente** (`../frontend-cliente`). También hospeda el build del panel en `public/` y expone el módulo de **Integración POS** con el sistema externo *eorderback*.

Zona horaria fija de El Salvador (UTC-6), autenticación por **JWT**, contraseñas y PIN con **bcrypt**, y correos con **nodemailer** (plantillas editables desde el panel).

```bash
pnpm install
cp .env.example .env     # completa BD, JWT, correo y (opcional) POS
pnpm seed:admin          # crea el primer usuario admin
pnpm dev                 # nodemon en http://localhost:4000
```

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` | Arranca con **nodemon** (recarga en caliente). |
| `pnpm start` | Arranca en producción (`node src/servidor.js`). |
| `pnpm seed:admin` | Crea/asegura el usuario administrador inicial. |
| `pnpm test` | Todas las pruebas (Vitest). |
| `pnpm test:unit` / `pnpm test:integration` | Solo unitarias / solo de integración. |

## Estructura

```
backend/
├── .env / .env.example      Variables de entorno (BD, JWT, correo, POS, CLIENT_URL)
├── CONFIGURAR_CORREO.md      Guía para configurar el correo (App Password de Gmail)
├── package.json              Dependencias y scripts
│
├── db_fidelizacion/          Esquema y migraciones SQL de la base de fidelización
│   ├── 01_ddl_db_fidelizacion.sql   DDL: creación de tablas
│   ├── 02_dml_db_fidelizacion.sql   DML: catálogos y datos iniciales
│   ├── bd_fidelizacion.sql          Dump completo (DDL+DML) para desplegar EN LIMPIO
│   └── migracion_*.sql              Migraciones ALTER, una por cambio (para BD ya existentes)
│
├── public/                   Panel del personal YA COMPILADO (lo sirve Express)
│   ├── index.html            Entrada del panel (build de ../frontend)
│   ├── assets/               JS/CSS con hash generados por el build
│   ├── img/                  Imágenes de fondo del panel
│   └── favicon.svg
│
├── src/
│   ├── servidor.js           Punto de entrada: levanta el servidor e inicia la integración POS
│   ├── aplicacion.js         Configuración de Express: middlewares, CORS, rutas, estáticos
│   │
│   ├── configuracion/
│   │   ├── bd.js             Pool de MySQL (fija la zona horaria El Salvador)
│   │   ├── correo.js         Envío de correos + marco de marca y plantillas (nodemailer)
│   │   ├── push.js           Notificaciones push
│   │   ├── recompensas.js    Valor del punto ($0.05) y utilidades de recompensas
│   │   └── logo-correo.png   Logo incrustado (CID) en los correos
│   │
│   ├── controladores/        Lógica de cada endpoint (uno por recurso)
│   │   ├── autenticacion.controlador.js   Login/refresh del personal (JWT)
│   │   ├── usuario.controlador.js         CRUD de usuarios del personal
│   │   ├── cliente.controlador.js         CRUD de clientes + reenviar código OTP
│   │   ├── transaccion.controlador.js     Registrar/editar/anular consumos, historial, resumen
│   │   ├── promocion.controlador.js       CRUD de promociones
│   │   ├── recompensa.controlador.js      CRUD del catálogo de recompensas
│   │   ├── configuracion.controlador.js   Parámetros del sistema (bienvenida, etc.)
│   │   ├── plantillas.controlador.js      Plantillas de correo editables + vista previa
│   │   ├── operador.controlador.js        Tour operadores y su historial
│   │   ├── portalCliente.controlador.js   Portal/app del cliente: OTP, mis-puntos, movimientos
│   │   └── ubicacion.controlador.js       Departamentos y distritos (catálogos)
│   │
│   ├── rutas/                Definición de rutas Express (una por recurso, espeja controladores)
│   │   └── *.rutas.js
│   │
│   ├── middlewares/
│   │   ├── autenticacion.middleware.js    Verifica el JWT y adjunta el usuario
│   │   ├── rol.middleware.js              Autoriza por rol (admin/recepcionista/cliente)
│   │   └── limiteIntentos.middleware.js   Rate-limit (login, OTP)
│   │
│   ├── dominio/
│   │   └── reglasPuntos.js   Cálculo PURO de puntos y descuentos (lógica de negocio, sin BD)
│   │
│   ├── integracion-pos/      Módulo de integración con el POS externo (eorderback)
│   │   ├── conexionPos.js    Conexión (solo lectura) al POS + perfiles Local/Web cifrados
│   │   ├── pos.servicio.js   Sincroniza clientes y pagos del POS → otorga puntos
│   │   ├── pos.controlador.js / pos.rutas.js   Endpoints del panel "Integración POS"
│   │   ├── db_fidelizacion_merasopa/   Esquema de la BD demo usada con el POS
│   │   ├── guias/            Guías (cómo correr, conexión remota, empresa nueva)
│   │   ├── pruebas/          SQL de ejemplo para probar la sincronización
│   │   ├── scripts/          Utilidades (crear_admin.js)
│   │   └── semilla_empresa/  Semillas para instalar en una empresa nueva
│   │
│   ├── semillas/
│   │   └── crearAdmin.js     Crea el usuario administrador inicial
│   │
│   └── tareas/               Tareas programadas (poller/avisos)
│       ├── clientes.tarea.js       Alertas de retención/reactivación por correo
│       └── promociones.tarea.js    Avisos de promoción nueva / por finalizar
│
├── test/                     Pruebas con Vitest + Supertest
│   ├── unit/                 Unitarias (ej. reglasPuntos)
│   ├── integration/          De integración (auth, clientes, transacciones, portal, ...)
│   └── helpers/              Utilidades de prueba (BD aislada, seeds, setup)
│
└── vitest.config.js          Configuración de Vitest (proyectos unit e integration)
```

## Notas

- **Esquema vs. migraciones:** todo cambio de tabla/campo va **siempre** al esquema `bd_fidelizacion.sql` (se despliega en limpio). Las `migracion_*.sql` son **una por cambio** y solo para actualizar una BD que ya existe (local/hosting).
- **El `.env` no se despliega** (está en `.gitignore`). En el hosting las variables (incluidas `CORREO_USUARIO`/`CORREO_CLAVE`) se configuran aparte.
- **Correo:** ver `CONFIGURAR_CORREO.md`. Las plantillas (asunto/textos/on-off) viven en la tabla `plantillas_correo` y se editan desde el panel; el marco (logo/colores) es fijo en `correo.js`.
