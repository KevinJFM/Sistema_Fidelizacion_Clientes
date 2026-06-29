import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import clientRoutes from "./routes/client.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

const app = express();

// Detrás de un proxy/hosting (Nginx, Render, etc.) para que el rate-limit lea la IP real
app.set("trust proxy", 1);

// Seguridad de headers HTTP
app.use(helmet());

// CORS restringido al frontend + permite enviar cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL,
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

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/clientes", clientRoutes);
app.use("/api/transacciones", transactionRoutes);

export default app;
