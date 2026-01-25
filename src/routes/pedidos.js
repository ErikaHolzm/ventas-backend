import { Router } from "express";
import {
  crearPedido,
  obtenerPedidos,
  cambiarEstadoPedido,
  obtenerPedidoPorId,
  reporteDelDia,
  resumenDelDia,
  cobrarPedido
} from "../controllers/pedidos.js";

import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";

const router = Router();

// crear pedido (cajero/admin)
router.post("/", verificarToken, verificarRol("cajero","admin"), crearPedido);


/// ver pedidos
router.get("/", verificarToken, obtenerPedidos);

// resumen del día
router.get("/resumen/dia", verificarToken, verificarRol("cajero", "admin"), resumenDelDia);

// reporte del día
router.get("/reportes/dia", verificarToken, verificarRol("admin"), reporteDelDia);

// cobrar
router.put("/:id/cobrar", verificarToken, verificarRol("cajero","admin"), cobrarPedido);

// cambiar estado
router.put("/:id/estado", verificarToken, verificarRol("cocina", "admin"), cambiarEstadoPedido);

// ver por id
router.get("/:id", verificarToken, obtenerPedidoPorId);

export default router;
