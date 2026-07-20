# Configurar el correo del código de acceso (OTP)

El portal/app del cliente entra con **DUI + un código de 6 dígitos** que se envía **por correo**.
El correo que **envía** los códigos se configura en `backend/.env` con una cuenta de Gmail y una
**Contraseña de aplicación** (App Password). Esta guía sirve para cuando cambien al correo de
**Punta Diamantes** (o cualquier otro).

> El `.env` es **local y NO se sube a GitHub** (está en `.gitignore`), así que la clave queda segura.

---

## 1. Enlaces directos de Google

- **Seguridad de la cuenta:** https://myaccount.google.com/security
- **Verificación en 2 pasos:** https://myaccount.google.com/signinoptions/twosv
- **Contraseñas de aplicaciones (App Passwords):** https://myaccount.google.com/apppasswords

> Inicia sesión con la cuenta que va a **enviar** los correos (la del hotel).

---

## 2. Pasos para generar la App Password

1. Entra a **https://myaccount.google.com/security** y activa la **Verificación en 2 pasos**
   (es requisito; sin esto no aparecen las contraseñas de aplicación).
2. Ve a **https://myaccount.google.com/apppasswords**
   (es distinta al "Gestor de contraseñas"; esta se llama **"Contraseñas de aplicaciones"**).
3. En **"Nombre de la aplicación"** escribe `Punta Diamantes` → **Crear**.
4. Google muestra **16 letras** en 4 bloques (ej. `abcd efgh ijkl mnop`). **Cópialas** — solo se ven una vez.
   - Deben ser **16 caracteres** exactos. Si copias 15, Gmail la rechaza.

---

## 3. Ponerla en el `.env`

En `backend/.env`:

```env
CORREO_USUARIO=correo-del-hotel@gmail.com
CORREO_CLAVE=las16letrasseguidas
```

- `CORREO_USUARIO` = el correo que **envía** (remitente).
- `CORREO_CLAVE` = la App Password de 16 letras, **sin espacios**.
- El código llega al **correo que el cliente tiene registrado** en la base de datos (destinatario),
  no a esta cuenta.

Después **reinicia el backend** para que tome los cambios.

---

## 4. Modo prueba (sin enviar correos)

Si `CORREO_USUARIO` **o** `CORREO_CLAVE` están **vacíos o comentados** (con `#` adelante),
el sistema NO envía correo y **imprime el código en la consola del backend**:

```
[OTP] Código para xxx@gmail.com: 483920  (vence en 5 min)
```

Útil para probar sin configurar correo. La app avisa que está en "modo prueba".

- Como cada quien tiene su **propio `.env`** (no se comparte por GitHub), si un compañero no
  configura el correo en su máquina, le queda en **modo consola** automáticamente.

---

## 5. Prueba rápida del correo (opcional)

Para verificar que la App Password sirve, sin levantar todo el backend, crea un archivo
temporal `backend/_testcorreo.mjs` con:

```js
import dotenv from 'dotenv';
dotenv.config();
import { enviarCodigoAcceso } from './src/configuracion/correo.js';

const destino = process.env.CORREO_USUARIO;
const ok = await enviarCodigoAcceso(destino, '123456', 5);
console.log(ok ? `OK: enviado a ${destino}` : 'No configurado (modo consola)');
process.exit(0);
```

Ejecuta `node _testcorreo.mjs` dentro de `backend/`. Si dice **OK** y te llega el correo, está listo.
Luego borra el archivo.

---

## Notas de seguridad

- El código es de **un solo uso**, **vence en 5 minutos**, se guarda **hasheado (bcrypt)** y tiene
  límite de intentos.
- La App Password **solo sirve para enviar correo**; no da acceso a la cuenta de Google.
- Si alguna vez se filtra, se **revoca** desde https://myaccount.google.com/apppasswords y se genera otra.
