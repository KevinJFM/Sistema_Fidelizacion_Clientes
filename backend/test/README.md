# Pruebas del backend — Sistema de Fidelización

Este proyecto usa **[Vitest](https://vitest.dev/)** como framework de pruebas y
**[Supertest](https://github.com/ladjs/supertest)** para probar los endpoints HTTP.

Hay dos niveles de prueba, separados en dos "proyectos" de Vitest:

| Proyecto      | Carpeta             | Qué prueba                                                        | ¿Necesita BD? |
|---------------|---------------------|-------------------------------------------------------------------|:-------------:|
| `unit`        | `test/unit/`        | Lógica de negocio **pura** (motor de puntos/descuentos/canje).    | ❌ No         |
| `integration` | `test/integration/` | Endpoints reales de la API contra una **BD MySQL de prueba**.     | ✅ Sí         |

## Cómo correr las pruebas

Desde la carpeta `backend/`:

```bash
pnpm test              # todas (unitarias + integración)
pnpm test:unit         # solo unitarias (rápidas, sin BD)
pnpm test:integration  # solo integración (crea la BD de prueba)
pnpm test:watch        # modo interactivo (re-corre al guardar)
```

## Pruebas unitarias

Prueban `src/dominio/reglasPuntos.js` → la función `calcularBeneficios()`, que
concentra el **motor de reglas**: cuántos puntos se ganan (base + bienvenida +
promoción), el canje, y qué descuento aplica según la prioridad
(canje > bienvenida > promoción > compra alta), sin tocar la base de datos.

> Esta lógica antes vivía dentro del controlador de transacciones mezclada con
> las consultas SQL. Se **extrajo a un módulo de dominio** para poder probarla
> de forma aislada, rápida y determinista (separación entre lógica de negocio y
> persistencia). El controlador sigue comportándose igual: ahora delega el
> cálculo a `calcularBeneficios()`.

## Pruebas de integración

Levantan la app de Express real y le pegan a los endpoints con Supertest,
verificando también los efectos en la base de datos (puntos, movimientos, etc.).

Cubren: **auth** (login/refresh/register + autorización por rol), **clientes**
(CRUD + validaciones), **transacciones** (acumulación de puntos, bienvenida,
promociones, canje y la **seguridad ante concurrencia** con `FOR UPDATE`),
**usuarios**, **recompensas**, **promociones**, **configuración** y **ubicaciones**.

### Base de datos de prueba

Las pruebas de integración **NO usan la BD de desarrollo**. Al arrancar
(`test/helpers/globalSetup.js`):

1. Se crea en limpio la base **`db_fidelizacion_test`** (se elimina y se vuelve
   a crear en cada corrida).
2. Se carga el **esquema real de producción** (`src/semillas/bd_fidelizacion.sql`),
   por lo que se prueba el mismo esquema que se desplegará.
3. Antes de cada test, `test/helpers/db.js` vacía las tablas mutables y restaura
   la configuración a sus valores por defecto (aislamiento entre casos).

**Requisitos:** MySQL local corriendo. Las credenciales se toman del
`backend/.env` (las mismas de desarrollo), pero apuntando a la BD de prueba.
Se puede cambiar el nombre de la BD de prueba con `TEST_DB_NAME` en el `.env`.

## Estructura

```
test/
├── unit/
│   └── reglasPuntos.test.js        # motor de reglas (puro)
├── integration/
│   ├── auth.test.js                # login, register, autorización
│   ├── clientes.test.js            # CRUD de clientes
│   ├── transacciones.test.js       # puntos, canje, concurrencia, historial
│   └── modulos-admin.test.js       # usuarios, recompensas, promociones, config, ubicaciones
└── helpers/
    ├── env.js                      # entorno de prueba (fuerza la BD de prueba)
    ├── globalSetup.js              # crea la BD de prueba desde el esquema real
    ├── setupIntegracion.js         # ajusta entorno y cierra el pool al final
    └── db.js                       # limpiar + sembrar datos (usuarios, clientes, etc.)
```
