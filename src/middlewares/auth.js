import jwt from "jsonwebtoken";

export function verificarToken(req, res, next) {
  try {
     
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ mensaje: "Token no proporcionado" });
    }

     
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ mensaje: "Token inválido o ausente" });
    }

    //verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // guardamos info del usuario en req para usar más adelante
    req.usuario = decoded;  

    //continuar al controlador
    next();

  } catch (error) {
    console.error("Error verificando token:", error);
    res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}
