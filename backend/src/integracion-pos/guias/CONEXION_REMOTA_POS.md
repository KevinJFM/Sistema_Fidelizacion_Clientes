# Dejar lista la BD del POS para aceptar conexión remota

Nuestro backend (en producción, en Hostinger) se conecta a la base del POS de la empresa
(ej. `eorderback`) en **solo lectura** para traer clientes y pagos. Para que eso funcione,
la BD del POS —que vive en la **máquina del negocio**, no en Hostinger— tiene que **aceptar
conexiones desde fuera**. Esta guía deja eso listo.

> ⚠️ **Lo primero que hay que entender:** en producción, el campo **"Servidor"** de la pantalla
> *Integración POS* **NO puede ser `localhost`**. `localhost` significaría "la BD del propio
> Hostinger", no la del POS. Hay que poner la **IP pública o dominio (DDNS)** de donde vive el POS.

El POS de referencia corre en **Windows con MySQL 8** (según el dump del asesor). Los pasos son
para ese caso.

---

## Resumen de lo que hay que lograr

```
[ Backend en Hostinger ]  ── internet ──▶  [ IP pública del negocio ]
                                                   │  (router: reenvía el 3306)
                                                   ▼
                                        [ PC del negocio: MySQL del POS ]
                                          usuario SOLO LECTURA + firewall abierto
```

Cuatro piezas: **(1)** MySQL escuchando en la red, **(2)** un usuario de solo lectura que pueda
entrar desde fuera, **(3)** el firewall de Windows abierto, **(4)** el router reenviando el puerto
y una dirección pública estable.

---

## Paso 1 — Que MySQL escuche en la red (no solo en localhost)

Por defecto MySQL suele escuchar solo en `127.0.0.1`. Hay que abrirlo a la red local.

1. Edita el archivo **`my.ini`** (normalmente en
   `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`).
2. Busca la línea `bind-address` y déjala así (escucha en todas las interfaces):
   ```ini
   bind-address = 0.0.0.0
   ```
3. Reinicia el servicio de MySQL (como administrador):
   ```powershell
   Restart-Service MySQL80
   ```
   *(el nombre puede ser `MySQL80`, `MySQL84`, etc. — míralo en `services.msc`)*

---

## Paso 2 — Crear un usuario de SOLO LECTURA que entre desde fuera

**No uses `root`.** Crea un usuario dedicado, con permiso **solo de SELECT** sobre la base del POS.
Ejecuta esto en MySQL Workbench del negocio (ajusta la contraseña):

```sql
-- Opción segura (recomendada): solo desde la IP pública del backend de Hostinger
CREATE USER 'fidelizacion_ro'@'IP_DEL_BACKEND' IDENTIFIED BY 'UnaContrasenaFuerte123!';
GRANT SELECT ON eorderback.* TO 'fidelizacion_ro'@'IP_DEL_BACKEND';

-- Opción abierta (más fácil, menos segura): desde cualquier IP
-- CREATE USER 'fidelizacion_ro'@'%' IDENTIFIED BY 'UnaContrasenaFuerte123!';
-- GRANT SELECT ON eorderback.* TO 'fidelizacion_ro'@'%';

FLUSH PRIVILEGES;
```

- `SELECT` únicamente: aunque alguien tuviera la contraseña, **no podría modificar** el POS.
  Encaja con que nuestro módulo es 100% de lectura.
- `'...'@'IP_DEL_BACKEND'` limita quién puede conectarse. Es lo más seguro. La IP pública del
  backend te la da Hostinger (o mírala con `curl ifconfig.me` desde el servidor).
- MySQL 8 usa por defecto `caching_sha2_password`; el conector de Node (`mysql2`) lo soporta,
  así que **no** hace falta cambiar el plugin de autenticación.

---

## Paso 3 — Abrir el puerto 3306 en el Firewall de Windows

En la PC del negocio, PowerShell **como administrador**:

```powershell
New-NetFirewallRule -DisplayName "MySQL POS 3306" -Direction Inbound `
  -Protocol TCP -LocalPort 3306 -Action Allow
```

> 🔒 Aún mejor: en esa regla, limita el origen a la IP del backend de Hostinger
> (parámetro `-RemoteAddress IP_DEL_BACKEND`), para no dejar el 3306 abierto a todo internet.

---

## Paso 4 — Router (NAT) y una dirección pública estable

Si la PC del negocio está detrás de un router (lo normal):

1. **Reenvío de puertos (Port Forwarding):** en el router, reenvía el puerto externo `3306`
   hacia la **IP local** de la PC del POS (ej. `192.168.1.50:3306`).
2. **Dirección pública:** el backend necesita saber a qué dirección conectarse.
   - Averigua la IP pública del negocio en https://whatismyip.com
   - Si esa IP **cambia** (lo normal en internet residencial), contrata IP fija con el ISP
     **o** usa un **DDNS gratis** (No-IP, DuckDNS) para tener un nombre estable como
     `merasopa.duckdns.org` que siempre apunte al negocio.

---

## Paso 5 — Probar y configurar en el panel

1. **Prueba desde fuera** (desde otra red, no la del negocio):
   ```powershell
   mysql -h IP_PUBLICA_O_DDNS -P 3306 -u fidelizacion_ro -p eorderback
   ```
   Si entra y puedes hacer `SELECT 1;`, la conexión remota ya sirve.
2. En el panel → **Integración POS**, pon:
   - **Servidor:** la IP pública o el DDNS (¡NO `localhost`!)
   - **Puerto:** `3306` (o el que reenviaste)
   - **Usuario:** `fidelizacion_ro`
   - **Contraseña:** la que pusiste
   - **Base de datos:** `eorderback`
3. Dale a **"Probar conexión"**. Si dice *"Conexión exitosa"*, guarda y sincroniza.

---

## Seguridad — léelo

Exponer MySQL a internet tiene riesgo. Mínimos que **sí o sí** conviene aplicar:

- **Usuario de solo lectura** (Paso 2) — nunca `root`, nunca con permisos de escritura.
- **Restringir por IP** el usuario y la regla de firewall a la IP del backend (no `'%'`, no abierto a todos).
- **Contraseña fuerte** y distinta a cualquier otra.

**Alternativa más segura (recomendada si se puede):** en vez de abrir el 3306 a internet, usar un
**túnel SSH** o una **VPN** entre Hostinger y la PC del negocio. Así MySQL nunca queda expuesto
directamente. Es más de montar, pero es lo ideal si el negocio maneja datos sensibles.

**Si el negocio no tiene forma de exponer su POS** (sin IP pública, sin permiso del ISP, etc.):
la otra vía es que el **sistema de fidelización viva junto al POS** (misma red/máquina) en lugar
de en Hostinger — pero eso cambia toda la estrategia de despliegue. Conviene decidirlo antes.
