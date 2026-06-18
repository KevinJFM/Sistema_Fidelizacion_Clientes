# Guía de Despliegue a Producción

Checklist para poner el Sistema de Fidelización en internet con dominio propio.
El código ya está preparado para producción; solo hay que ajustar variables y la infraestructura.

---

## 1. Variables de entorno

### Backend (`backend/.env` en el servidor)

```env
NODE_ENV=production
PORT=4000

# Dominio del frontend (para CORS) — sin barra final
CLIENT_URL=https://tudominio.com

# Base de datos de producción
DB_HOST=localhost
DB_PORT=3306
DB_NAME=db_fidelizacion
DB_USER=usuario_produccion        # NO usar root en producción
DB_PASSWORD=una_contraseña_fuerte

# Secretos (generar NUEVOS, distintos a los de desarrollo)
JWT_SECRET=...generar...
JWT_EXPIRES_IN=15m
REFRESH_SECRET=...generar...
REFRESH_EXPIRES_IN=7d
```

Generar secretos nuevos y fuertes:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`frontend/.env` antes de compilar)

```env
VITE_API_URL=https://api.tudominio.com/api
```

> ⚠️ Las variables `VITE_*` se incrustan al compilar (`pnpm build`). Si cambias la URL,
> hay que volver a compilar el frontend.

---

## 2. Checklist de seguridad (ya implementado en el código)

- [x] Secretos JWT/Refresh fuertes y por variable de entorno
- [x] Access token corto (15 min) + Refresh token en cookie `httpOnly`
- [x] Cookie `Secure` + `SameSite=none` automáticos cuando `NODE_ENV=production`
- [x] CORS restringido a `CLIENT_URL` con `credentials: true`
- [x] `helmet` (headers de seguridad)
- [x] `trust proxy` (rate-limit lee la IP real detrás del proxy)
- [x] Rate limiting en login (5 intentos / 15 min)
- [x] Contraseñas hasheadas con bcrypt
- [x] Queries parametrizadas (protege de inyección SQL)

### Verificar en el servidor
- [ ] `NODE_ENV=production` está seteado
- [ ] HTTPS activo (sin esto, las cookies `Secure` NO funcionan)
- [ ] El `.env` NO está en el repositorio (ya está en `.gitignore`)
- [ ] Usuario de base de datos sin privilegios de root

---

## 3. Build del frontend

```bash
cd frontend
pnpm install
pnpm build          # genera la carpeta dist/
```

La carpeta `dist/` son archivos estáticos: se sirven con Nginx, o desde un hosting
estático (Vercel, Netlify, etc.).

---

## 4. Backend en el servidor

```bash
cd backend
pnpm install --prod
```

Mantenerlo corriendo permanentemente con **PM2** (sobrevive reinicios y caídas):

```bash
npm install -g pm2
pm2 start src/server.js --name fidelizacion-api
pm2 save
pm2 startup        # para que arranque al reiniciar el servidor
```

---

## 5. HTTPS y proxy inverso (Nginx)

El backend corre en el puerto 4000 (HTTP interno). Nginx pone el HTTPS por delante
y enruta el tráfico.

Ejemplo de configuración Nginx:

```nginx
# Frontend (archivos estáticos)
server {
    server_name tudominio.com;
    root /var/www/fidelizacion/frontend/dist;
    index index.html;
    location / {
        try_files $uri /index.html;   # para que funcione React Router
    }
}

# API
server {
    server_name api.tudominio.com;
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Certificado SSL gratis con **Certbot (Let's Encrypt)**:
```bash
sudo certbot --nginx -d tudominio.com -d api.tudominio.com
```

---

## 6. Base de datos

- [ ] Crear la BD ejecutando el script SQL (tablas `estados`, `roles`, `usuarios`)
- [ ] Insertar los datos iniciales (estados y roles)
- [ ] Crear un usuario admin inicial
- [ ] Configurar respaldos automáticos (`mysqldump` en un cron diario)

---

## 7. Flujo de trabajo recomendado

```
1. Desarrollas y pruebas en LOCAL (pnpm dev)
2. git commit + git push
3. En el servidor: git pull
4. Backend: pnpm install (si hay deps nuevas) + pm2 restart fidelizacion-api
5. Frontend: pnpm build (si cambió el front)
```

---

## Mejoras futuras de seguridad (opcionales)

- Tabla `refresh_tokens` en la BD para poder revocar sesiones al instante
  ("cerrar sesión en todos los dispositivos").
- Verificación de email al registrarse.
- Logs de auditoría (quién hizo qué y cuándo).
- 2FA (doble factor) para administradores.
