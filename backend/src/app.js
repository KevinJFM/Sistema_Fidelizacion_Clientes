import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.get("/", (req, res) => {
  res.json({ message: "API Sistema de Fidelización de Clientes" });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", userRoutes);

export default app;
