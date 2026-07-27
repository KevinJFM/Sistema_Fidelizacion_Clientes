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

En una terminal **nueva** (puedes dejar la de Punta Diamantes corriendo en el 4000):

```powershell
$env:DB_NAME='db_fidelizacion_merasopa'; $env:PORT='4001'; pnpm dev
```

- `DB_NAME` manda el backend a la base de la empresa.
- `PORT=4001` evita chocar con el 4000 de Punta Diamantes.
- No hace falta otro `.env`: las variables que pongas en la terminal **mandan** sobre el `.env`
  (dotenv no las sobrescribe). El resto (JWT, correo, etc.) se sigue tomando del `.env`.

Para que el **panel** hable con esa instancia durante la demo, apunta el frontend a ese puerto:
en `frontend/.env` pon `VITE_API_URL=http://TU-IP:4001/api` (o `http://localhost:4001/api`) y
reinícialo.

---

## Paso 4 — Configurar la integración POS en esa instancia

1. Entra al panel (conectado al 4001) → **Integración POS**.
2. Conecta a la base del POS de la empresa (ej. `eorderback`) y **Guarda**.
3. Ponlo en **Automático** y usa **Sincronizar ahora**.

Sus clientes y puntos quedan en **`db_fidelizacion_merasopa`** — nunca en la de Punta Diamantes. ✅

---

## Notas
- El **menú "Integración POS" sigue visible** en todas las instancias (así se demuestra la
  capacidad de conectarse a otras BD). En la instancia de Punta Diamantes ese menú existe pero
  no se usa (su base ya no tiene las tablas del POS); la demo del POS se hace en la instancia
  de la empresa (la del 4001), que sí las tiene.
- Para agregar **otra** empresa en el futuro: repite el Paso 1 con otro nombre y levanta otra
  instancia en otro puerto (4002, 4003, ...). Mismo sistema, bases aisladas.
