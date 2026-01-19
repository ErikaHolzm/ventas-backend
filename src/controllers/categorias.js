import db from "../config/db.js";

export async function getCategorias(req, res) {
  try {
    const [rows] = await db.query("SELECT id, nombre FROM categorias ORDER BY nombre ASC");
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo categorias:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

