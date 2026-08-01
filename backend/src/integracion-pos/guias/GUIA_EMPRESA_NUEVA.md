# Montar una empresa nueva (BD propia + integración POS)

Cada empresa cliente tiene **su propia base de fidelización** (mismo esquema que Punta
Diamantes) y **su POS de solo lectura**. La base de Punta Diamantes (`db_fidelizacion`)
**nunca** se toca. Ejemplo con la empresa del asesor → base `db_fidelizacion_merasopa`.

> Todos los comandos se corren **desde la carpeta `backend`** y el backend usa **pnpm**.

---

## Paso 1 — Crear la BD de la empresa (a mano, en Workbench)

Abre **`semilla_empresa/db_fidelizacion_merasopa.sql`** y ejecútalo **completo** en MySQL
Workbench. Crea `db_fidelizacion_merasopa` con todo el sistema + las 3 tablas del POS + un
admin de arranque (**admin@empresa.com / Admin123**).

Para **otra** empresa: en Workbench haz "Buscar y reemplazar" de `db_fidelizacion_merasopa`
por el nombre que quieras antes de ejecutar. Más detalle en `semilla_empresa/README.md`.

---

## Paso 3 — Levantar el backend apuntando a esa BD

Hay dos formas (detalle completo en [guias/COMO_CORRER.md](COMO_CORRER.md)):

**Opción simple (recomendada) — mismo puerto 4000.** En `backend/.env` deja activa la línea de
la empresa y comenta la otra, y **reinicia el backend** (Ctrl + C + `pnpm dev`). El frontend no
se toca (sigue en el 4000):
```env
# DB_NAME=db_fidelizacion            # Punta Diamantes
DB_NAME=db_fidelizacion_merasopa     # esta empresa
```
> ⚠️ Reiniciar es obligatorio: el `.env` se lee solo al arrancar y **nodemon no vigila el `.env`**.

**Opción dos puertos — para ver ambas a la vez.** En una terminal nueva (deja el 4000 corriendo),
las variables de la terminal mandan sobre el `.env`:
```powershell
$env:DB_NAME='db_fidelizacion_merasopa'; $env:PORT='4001'; pnpm dev
```
Y apunta el panel a ese puerto: en `frontend/.env` pon `VITE_API_URL=http://localhost:4001/api`
(o `http://TU-IP:4001/api`) y reinicia Vite.

---

## Paso 4 — Configurar la integración POS en esa instancia

1. Entra al panel (conectado al 4001) → **Integración POS**.
2. Conecta a la base del POS de la empresa (ej. `eorderback`) y **Guarda**.
3. Ponlo en **Automático** y usa **Sincronizar ahora**.

Sus clientes y puntos quedan en **`db_fidelizacion_merasopa`** — nunca en la de Punta Diamantes. ✅

---

## Notas
- El **menú "Integración POS" se muestra u oculta con el flag `POS_ENABLED`** del `.env` del
  backend:
  - `POS_ENABLED=true` → **visible** (para la defensa / instancia de Mera Sopa).
  - `POS_ENABLED=false` o ausente → **oculto** (entrega a Punta Diamantes). Además, la ruta
    `/admin/integracion-pos` queda **bloqueada por URL** (redirige al panel).
  - Es *secure-by-default*: si el flag no está, el módulo NO se ve. El backend lo decide y lo
    envía en el login/refresh; no depende de recompilar el frontend.
- Para agregar **otra** empresa en el futuro: repite el Paso 1 con otro nombre y levanta otra
  instancia en otro puerto (4002, 4003, ...). Mismo sistema, bases aisladas.
