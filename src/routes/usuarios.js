import { Router } from "express";
import { getUsuarios, getUsuarioPorId, crearUsuario, actualizarUsuario, eliminarUsuario } from "../controllers/usuarios.js";


const router = Router();

router.get("/", getUsuarios);
router.get("/:id", getUsuarioPorId);
router.post("/", crearUsuario);
router.put("/:id", actualizarUsuario);
router.patch("/:id/desactivar", eliminarUsuario);

export default router;
