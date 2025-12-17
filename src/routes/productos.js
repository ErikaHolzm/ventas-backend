import { Router } from "express";
import { getProductosPorCategoria } from "../controllers/productos.js";

const router = Router();

router.get("/:categoria_id", getProductosPorCategoria);  

export default router;

