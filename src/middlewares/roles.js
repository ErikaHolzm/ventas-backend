export function verificarRol(...rolesPermitidos) {
  return (req, res, next) => {
    const rolUsuario = req.usuario?.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({ mensaje: "No tienes permisos para esta acción" });
    }

    next();
  };
}
