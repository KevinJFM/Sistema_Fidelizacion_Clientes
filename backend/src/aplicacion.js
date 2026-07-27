import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rutasAuth from "./rutas/autenticacion.rutas.js";
import rutasUsuarios from "./rutas/usuario.rutas.js";
import rutasClientes from "./rutas/cliente.rutas.js";
import rutasTransacciones from "./rutas/transaccion.rutas.js";
import rutasUbicaciones from "./rutas/ubicacion.rutas.js";
import rutasConfiguracion from "./rutas/configuracion.rutas.js";
import rutasPromociones from "./rutas/promocion.rutas.js";
import rutasOperadores from "./rutas/operador.rutas.js";
import rutasPortalCliente from "./rutas/portalCliente.rutas.js";
import rutasRecompensas from "./rutas/recompensa.rutas.js";
import rutasPos from "./integracion-pos/pos.rutas.js";

const app = express();

// Detrás de un proxy/hosting (Nginx, Render, etc.) para que el rate-limit lea la IP real
app.set("trust proxy", 1);

// Seguridad de headers HTTP + CSP explícita
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc:    ["'self'"],
        objectSrc:  ["'none'"],
        frameSrc:   ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

// Orígenes permitidos: el panel del personal y el portal del cliente.
// CLIENT_URL puede traer varias URLs separadas por coma (ej: "https://app...,https://puntos...").
const origenesPermitidos = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// CORS restringido a esos orígenes + permite enviar cookies
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman, curl
      if (origenesPermitidos.length === 0)
        return callback(new Error('CLIENT_URL no está configurado en el entorno'));
      if (origenesPermitidos.includes(origin)) return callback(null, true);
      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);

// Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rutas
app.get("/", (req, res) => {
  res.json({ message: "API Sistema de Fidelización de Clientes" });
});

app.use("/api/auth", rutasAuth);
app.use("/api/usuarios", rutasUsuarios);
app.use("/api/clientes", rutasClientes);
app.use("/api/transacciones", rutasTransacciones);
app.use("/api/ubicaciones", rutasUbicaciones);
app.use("/api/configuracion", rutasConfiguracion);
app.use("/api/promociones", rutasPromociones);
app.use("/api/operadores", rutasOperadores);
app.use("/api/portal", rutasPortalCliente);
app.use("/api/recompensas", rutasRecompensas);
app.use("/api/pos", rutasPos);

export default app;
