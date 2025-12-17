import db from "../config/db.js";

export async function getProductosPorCategoria(req, res) {
  try {
    const categoriaId = req.params.categoria_id;

    const [rows] = await db.query(
      "SELECT id, nombre, precio FROM productos WHERE categoria_id = ?",
      [categoriaId]  
    );

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
