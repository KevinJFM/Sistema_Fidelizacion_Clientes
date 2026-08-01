# Cómo correr el sistema y cambiar entre Punta Diamantes y Merasopa

Antes de nada: **enciende MySQL** (el mismo servicio que usas con Workbench) y asegúrate de
tener **las dos bases importadas**: `db_fidelizacion` (Punta Diamantes) y
`db_fidelizacion_merasopa` (demo del POS). Usa **pnpm** (NO npm).

Hay **dos formas** de alternar entre empresas. La **A** es la recomendada para el día a día
(un solo puerto, no tienes que tocar el frontend). La **B** es solo si necesitas ver **las dos
al mismo tiempo**.

---

## ✅ A) Método simple — un solo puerto 4000 (recomendado)

Es un **solo backend**. Cambias de base editando **una línea** en `backend\.env` y **reinicias
el backend**. El frontend NO se toca (siempre apunta al 4000).

### El bloque en `backend\.env`

Deja **una sola línea `DB_NAME` activa** y la otra comentada con `#`:

```env
# ===== Elige UNA (comenta la otra) y REINICIA el backend =====
DB_NAME=db_fidelizacion              # Punta Diamantes
# DB_NAME=db_fidelizacion_merasopa   # Merasopa (demo del POS)
```

### Pasos para CAMBIAR a Merasopa

**1)** En `backend\.env`, mueve el `#`: comenta Punta Diamantes y activa Merasopa:
```env
# DB_NAME=db_fidelizacion            # Punta Diamantes
DB_NAME=db_fidelizacion_merasopa     # Merasopa (demo del POS)
```

**2) Reinicia el backend** (este paso es OBLIGATORIO):
```powershell
# En la terminal del backend: Ctrl + C para detener, y de nuevo:
cd "c:\Users\kevin\Desktop\sistema fidelzacion clientes\backend"
pnpm dev
```

> ⚠️ **Por qué hay que reiniciar:** el `.env` se lee **una sola vez** al arrancar, y la conexión
> a la BD se crea en ese momento. Además **nodemon NO vigila el `.env`** (solo reinicia con
> cambios en archivos `.js/.json`), así que **guardar el `.env` no basta**: si no reinicias,
> el backend sigue conectado a la base anterior. (Truco: guardar cualquier `.js` también fuerza
> el reinicio de nodemon.)

**3) Entra** en http://localhost:5173 con **admin@empresa.com / Admin123**.

### Para VOLVER a Punta Diamantes

Igual pero al revés: deja activo `DB_NAME=db_fidelizacion`, comenta el de Merasopa, **reinicia
el backend** y entra con tu usuario de siempre.

> El **frontend no cambia**: `frontend\.env` se queda en `VITE_API_URL=http://localhost:4000/api`
> y no hay que reiniciar Vite. Solo recarga el navegador (Ctrl + Shift + R) tras reiniciar el backend.

---

## B) Método de dos puertos — ver AMBAS a la vez (opcional)

Úsalo **solo** si quieres tener Punta Diamantes (4000) y Merasopa (4001) corriendo en paralelo.
Aquí las variables van en la **terminal** y **mandan** sobre el `.env` (no hace falta editarlo).

**1) Levantar Merasopa en el 4001** (terminal aparte; deja el 4000 corriendo):
```powershell
cd "c:\Users\kevin\Desktop\sistema fidelzacion clientes\backend"
$env:DB_NAME='db_fidelizacion_merasopa'; $env:PORT='4001'; pnpm dev
```

**2) Apuntar el panel al 4001** — en `frontend\.env`:
```
VITE_API_URL=http://localhost:4001/api
```
Vite lee ese archivo **solo al arrancar**, así que **reinícialo** (Ctrl + C y `pnpm dev` en
`frontend`) y recarga el navegador (Ctrl + Shift + R).

**3) Entrar** en http://localhost:5173 con **admin@empresa.com / Admin123**.

Para volver a Punta Diamantes: apunta `VITE_API_URL` de nuevo al `http://localhost:4000/api`,
reinicia Vite y listo.

---

## Resumen

| Método | Backend | Puerto | ¿Se toca el frontend? | ¿Reinicia? |
|---|---|---|---|---|
| **A — simple (recomendado)** | 1 solo, cambias `DB_NAME` en `.env` | 4000 | No | **Backend** (Ctrl+C + `pnpm dev`) |
| **B — dos a la vez** | 2 (uno por empresa) | 4000 y 4001 | Sí (`VITE_API_URL`) | **Vite** al cambiar de puerto |

| Empresa          | DB_NAME                  | Login                         |
|------------------|--------------------------|-------------------------------|
| Punta Diamantes  | db_fidelizacion          | tu usuario de siempre         |
| Merasopa (demo)  | db_fidelizacion_merasopa | admin@empresa.com / Admin123 |

- Para detener cualquier backend: **Ctrl + C** en su terminal.
- El panel siempre queda en http://localhost:5173.
