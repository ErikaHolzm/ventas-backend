import express from "express";
import cors from "cors";
import db from "./config/db.js";

import pedidosRoutes from "./routes/pedidos.js";
import productosRoutes from "./routes/productos.js";
import usuariosRoutes from "./routes/usuarios.js";
import categoriasRoutes from "./routes/categorias.js";
 

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente " });
});

app.use("/api/categorias", categoriasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/pedidos", pedidosRoutes);

export default app;
