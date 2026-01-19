import { Router } from "express";
import {
  crearPedido,
  obtenerPedidos,
  cambiarEstadoPedido,
  obtenerPedidoPorId,
  reporteDelDia
} from "../controllers/pedidos.js";

import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";

const router = Router();

// crear pedido (cajero o admin)
router.post("/", verificarToken, verificarRol("cajero", "admin"), crearPedido);

// ver pedidos según rol
router.get("/", verificarToken, obtenerPedidos);

// ✅ reporte del día (admin) — tiene que ir antes que "/:id"
router.get("/reportes/dia", verificarToken, verificarRol("admin"), reporteDelDia);

// cambiar estado del pedido (cocina o admin)
router.put("/:id/estado", verificarToken, verificarRol("cocina", "admin"), cambiarEstadoPedido);

// ver pedido por id
router.get("/:id", verificarToken, obtenerPedidoPorId);

export default router;

