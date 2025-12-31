import { Router } from "express";
import { getUsuarios, getUsuarioPorId, crearUsuario, actualizarUsuario, eliminarUsuario, loginUsuario } from "../controllers/usuarios.js";
import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";


const router = Router();

router.get("/", verificarToken, verificarRol("admin"), getUsuarios);

router.get("/:id", getUsuarioPorId);
router.post("/", crearUsuario);
router.put("/:id", actualizarUsuario);
router.patch("/:id/desactivar", eliminarUsuario);
router.post("/login", loginUsuario); 

export default router;
