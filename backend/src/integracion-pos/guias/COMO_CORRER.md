# Cómo correr la DEMO del POS y cambiar de instancia

Antes de nada: **enciende MySQL** (el mismo servicio que usas con Workbench).
Usa **pnpm** (NO npm). Cada parte va en **su propia terminal**.

> ⚠️ **Regla de oro:** el panel le habla a **un solo backend a la vez**, según el puerto en
> `frontend\.env`. Vite lee ese archivo **solo al arrancar**, así que cada vez que lo cambies
> hay que **reiniciar Vite** (Ctrl + C y de nuevo `pnpm dev`) y recargar el navegador (Ctrl + Shift + R).

---

## ▶ Ver MERASOPA (demo del POS) — puerto 4001

**1) Levantar la instancia de Merasopa** (terminal aparte; puedes dejar el 4000 corriendo):
```powershell
cd "c:\Users\kevin\Desktop\sistema fidelzacion clientes\backend"
$env:DB_NAME='db_fidelizacion_merasopa'; $env:PORT='4001'; pnpm dev
```

**2) Apuntar el panel al 4001** — en `frontend\.env`:
```
VITE_API_URL=http://localhost:4001/api
```
Reinicia Vite:
```powershell
cd "c:\Users\kevin\Desktop\sistema fidelzacion clientes\frontend"
pnpm dev
```

**3) Entrar** en http://localhost:5173 con **admin@merasopa.com / Admin123**.

---

## ▶ Volver a PUNTA DIAMANTES (lo normal) — puerto 4000

**1) Backend normal** (sin variables extra):
```powershell
cd "c:\Users\kevin\Desktop\sistema fidelzacion clientes\backend"
pnpm dev
```

**2) Apuntar el panel al 4000** — en `frontend\.env`:
```
VITE_API_URL=http://localhost:4000/api
```
Reinicia Vite (`pnpm dev` en `frontend`) y entra con tu usuario de siempre.

---

## Resumen

| Empresa          | Backend (DB_NAME)        | Puerto | `VITE_API_URL`             | Login                         |
|------------------|--------------------------|--------|----------------------------|-------------------------------|
| Punta Diamantes  | db_fidelizacion          | 4000   | http://localhost:4000/api  | tu usuario de siempre         |
| Merasopa (demo)  | db_fidelizacion_merasopa | 4001   | http://localhost:4001/api  | admin@merasopa.com / Admin123 |

- Para detener cualquiera: **Ctrl + C** en su terminal.
- El panel siempre queda en http://localhost:5173 (solo cambia a qué backend apunta).
