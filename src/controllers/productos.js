import db from "../config/db.js";

export async function getProductosPorCategoria(req, res) {
  try {
    const categoriaId = req.params.categoria_id;

    const [rows] = await db.query(
      "SELECT id, nombre, precio FROM productos WHERE categoria_id = ? AND activo = 1",
      [categoriaId]  
    );

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

export async function crearProducto(req, res) {
  try {
    const { nombre, precio, categoria_id } = req.body;

    // validar campos obligatorios
    if (!nombre || !precio || !categoria_id) {
      return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }

    // verificar si ya existe un producto con ese nombre
    const [productoExistente] = await db.query(
      "SELECT id FROM productos WHERE nombre = ?",
      [nombre]
    );

    if (productoExistente.length > 0) {
      return res.status(400).json({ mensaje: "El producto ya existe" });
    }

    // validar que la categoría exista
    const [categoria] = await db.query(
      "SELECT id FROM categorias WHERE id = ?",
      [categoria_id]
    );

    if (categoria.length === 0) {
      return res.status(400).json({ mensaje: "Categoría inválida" });
    }

    // insertar producto
    const [result] = await db.query(
      "INSERT INTO productos (nombre, precio, categoria_id) VALUES (?, ?, ?)",
      [nombre, precio, categoria_id]
    );

    // respuesta de éxito
    res.status(201).json({
      mensaje: "Producto creado correctamente",
      productoId: result.insertId,
    });

  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function desactivarProducto(req, res) {
  try {
    const productoId = req.params.id;

    // ejecutar desactivación
    const [result] = await db.query(
      "UPDATE productos SET activo = 0 WHERE id = ?",
      [productoId]
    );

    // si no se modificó ninguna fila → no existe
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    // exito
    res.json({ mensaje: "Producto desactivado correctamente" });

  } catch (error) {
    console.error("Error desactivando producto:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function actualizarProducto(req, res) {
  try {
    const productoId = req.params.id;
    const { nombre, precio, categoria_id } = req.body;

    // validar que llegue al menos un campo
    if (!nombre && !precio && !categoria_id) {
      return res.status(400).json({
        mensaje: "Debes enviar al menos un campo para actualizar"
      });
    }

    // verificar que el producto exista
    const [producto] = await db.query(
      "SELECT id FROM productos WHERE id = ? AND activo = 1",
      [productoId]
    );

    if (producto.length === 0) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    // si llega una categoría nueva, verificar que exista
    if (categoria_id) {
      const [categoria] = await db.query(
        "SELECT id FROM categorias WHERE id = ?",
        [categoria_id]
      );
      if (categoria.length === 0) {
        return res.status(400).json({ mensaje: "Categoría inválida" });
      }
    }

    // actualizar producto
    const [result] = await db.query(
      `UPDATE productos 
       SET nombre = COALESCE(?, nombre),
           precio = COALESCE(?, precio),
           categoria_id = COALESCE(?, categoria_id)
       WHERE id = ?`,
      [nombre, precio, categoria_id, productoId]
    );

    res.json({ mensaje: "Producto actualizado correctamente" });

  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function obtenerTodosLosProductos(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT 
        p.id,
        p.nombre,
        p.precio,
        c.nombre AS categoria,
        p.activo
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      ORDER BY p.id DESC`
    );

    res.json(rows);

  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function buscarProductos(req, res) {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      return res.status(400).json({ mensaje: "Debes enviar un parámetro de búsqueda" });
    }

    const busqueda = `%${nombre}%`; // permite buscar por partes del nombre

    const [rows] = await db.query(
      `SELECT 
        p.id,
        p.nombre,
        p.precio,
        c.nombre AS categoria,
        p.activo
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.nombre LIKE ?
      ORDER BY p.nombre ASC`,
      [busqueda]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error buscando productos:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function obtenerProductoPorId(req, res) {
  try {
    const productoId = req.params.id;

    const [rows] = await db.query(
      "SELECT id, nombre, precio, categoria_id, activo FROM productos WHERE id = ?",
      [productoId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("Error obteniendo producto:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function activarProducto(req, res) {
  try {
    const productoId = req.params.id;

    const [result] = await db.query(
      "UPDATE productos SET activo = 1 WHERE id = ?",
      [productoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json({ mensaje: "Producto activado correctamente" });

  } catch (error) {
    console.error("Error activando producto:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

export async function ventasDelDia(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT SUM(total) AS total_dia 
       FROM pedidos 
       WHERE DATE(creado_en) = CURDATE() 
       AND estado = 'entregado'`
    );

    res.json({
      total_del_dia: rows[0].total_dia || 0
    });

  } catch (error) {
    console.error("Error obteniendo ventas del día:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

