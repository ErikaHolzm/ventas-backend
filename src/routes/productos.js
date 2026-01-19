import { Router } from "express";
import {
  getProductosPorCategoria,
  crearProducto,
  desactivarProducto,
  obtenerTodosLosProductos,
  actualizarProducto,
  buscarProductos,
  obtenerProductoPorId,
  activarProducto,
  ventasDelDia
} from "../controllers/productos.js";

import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";

const router = Router();


router.get("/admin/listado", verificarToken, verificarRol("admin"), obtenerTodosLosProductos);
router.get("/admin/buscar", verificarToken, verificarRol("admin"), buscarProductos);
router.get("/admin/producto/:id", verificarToken, verificarRol("admin"), obtenerProductoPorId);

router.post("/", verificarToken, verificarRol("admin"), crearProducto);
router.put("/:id", verificarToken, verificarRol("admin"), actualizarProducto);


router.patch("/:id/desactivar", verificarToken, verificarRol("admin"), desactivarProducto);

router.patch("/:id/activar", verificarToken, verificarRol("admin"), activarProducto);

router.get("/reportes/ventas-dia", verificarToken, verificarRol("admin"), ventasDelDia);


router.get("/categoria/:categoria_id", verificarToken, getProductosPorCategoria);

export default router;


