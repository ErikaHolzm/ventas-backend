import { Router } from "express";
import { getCategorias } from "../controllers/categorias.js";
import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";

const router = Router();


router.get("/", verificarToken, getCategorias);


export default router;

