import { Router } from "express";
import { getUsuarios, getUsuarioPorId, crearUsuario, actualizarUsuario, eliminarUsuario, loginUsuario, cambiarRolUsuario } from "../controllers/usuarios.js";
import { verificarToken } from "../middlewares/auth.js";
import { verificarRol } from "../middlewares/roles.js";


const router = Router();

//PUBLICAS
router.post("/login", loginUsuario);
router.post("/", crearUsuario);

//PROTEGIDAS
router.get("/", verificarToken, verificarRol("admin"), getUsuarios);
router.put("/:id/rol", verificarToken, verificarRol("admin"), cambiarRolUsuario);



router.get("/:id", verificarToken, verificarRol("admin"), getUsuarioPorId);
router.put("/:id", verificarToken, verificarRol("admin"), actualizarUsuario);
router.patch("/:id/desactivar", verificarToken, verificarRol("admin"), eliminarUsuario);


export default router;
