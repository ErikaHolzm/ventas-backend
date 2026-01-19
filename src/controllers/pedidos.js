import db from "../config/db.js";

const ESTADOS_VALIDOS = ["pendiente", "en_proceso", "entregado", "cancelado"];

// =======================
// CREAR PEDIDO (POS)
// =======================
export async function crearPedido(req, res) {
  const conn = await db.getConnection();

  try {
    const { usuario_id, items } = req.body;

    if (!usuario_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: "Faltan datos del pedido" });
    }

    // validar items básicos
    for (const item of items) {
      if (!item.producto_id || !item.cantidad || Number(item.cantidad) <= 0) {
        return res.status(400).json({ mensaje: "Items inválidos" });
      }
    }

    await conn.beginTransaction();

    // 1) Traer precios reales desde DB (NO confiar en front)
    const productoIds = items.map(i => i.producto_id);

    const [productos] = await conn.query(
      `SELECT id, precio
       FROM productos
       WHERE id IN (${productoIds.map(() => "?").join(",")})
       AND activo = 1`,
      productoIds
    );

    const precios = new Map(productos.map(p => [p.id, Number(p.precio)]));

    // si algún producto no existe/está inactivo => error
    for (const item of items) {
      if (!precios.has(item.producto_id)) {
        await conn.rollback();
        return res.status(400).json({
          mensaje: `Producto inválido o inactivo: ${item.producto_id}`
        });
      }
    }

    // 2) Calcular total
    const total = items.reduce((sum, item) => {
      return sum + precios.get(item.producto_id) * Number(item.cantidad);
    }, 0);

    // 3) Insertar pedido (creado_en si existe en tu tabla)
    const [pedidoResult] = await conn.query(
      "INSERT INTO pedidos (usuario_id, total, creado_en, estado) VALUES (?, ?, NOW(), 'pendiente')",
      [usuario_id, total]
    );

    const pedidoId = pedidoResult.insertId;

    // 4) Insertar items en items_pedido (con subtotal)
    for (const item of items) {
      const precio = precios.get(item.producto_id);
      const subtotal = precio * Number(item.cantidad);

      await conn.query(
        "INSERT INTO items_pedido (pedido_id, producto_id, cantidad, subtotal) VALUES (?, ?, ?, ?)",
        [pedidoId, item.producto_id, item.cantidad, subtotal]
      );
    }

    await conn.commit();

    return res.status(201).json({
      mensaje: "Pedido creado correctamente",
      pedidoId,
      total,
      estado: "pendiente"
    });

  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error("Error creando pedido:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  } finally {
    conn.release();
  }
}

// =======================
// OBTENER PEDIDOS (según rol)
// =======================
export async function obtenerPedidos(req, res) {
  try {
    const rol = req.usuario?.rol; // respetamos tu estructura

    let query = "SELECT id, usuario_id, total, creado_en, estado FROM pedidos";
    const params = [];

    // Cocina ve solo los que están pendientes o en proceso
    if (rol === "cocina") {
      query += " WHERE estado IN ('pendiente', 'en_proceso')";
    }

    // Cajero: opcional: solo los del día (si querés)
    if (rol === "cajero") {
      query += " WHERE DATE(creado_en) = CURDATE()";
    }

    query += " ORDER BY creado_en DESC";

    const [rows] = await db.query(query, params);
    return res.json(rows);

  } catch (error) {
    console.error("Error obteniendo pedidos:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

// =======================
// CAMBIAR ESTADO (cocina/admin)
// =======================
export async function cambiarEstadoPedido(req, res) {
  try {
    const pedidoId = req.params.id;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        mensaje: `Estado inválido. Usá: ${ESTADOS_VALIDOS.join(", ")}`
      });
    }

    const [result] = await db.query(
      "UPDATE pedidos SET estado = ? WHERE id = ?",
      [estado, pedidoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }

    return res.json({ mensaje: "Estado actualizado correctamente", estado });

  } catch (error) {
    console.error("Error cambiando estado:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

// =======================
// OBTENER PEDIDO POR ID (con items + nombre)
// =======================
export async function obtenerPedidoPorId(req, res) {
  try {
    const pedidoId = req.params.id;

    const [pedido] = await db.query(
      "SELECT id, usuario_id, total, creado_en, estado FROM pedidos WHERE id = ?",
      [pedidoId]
    );

    if (pedido.length === 0) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }

    const [items] = await db.query(
      `SELECT 
        i.producto_id,
        p.nombre AS producto,
        i.cantidad,
        i.subtotal
      FROM items_pedido i
      JOIN productos p ON p.id = i.producto_id
      WHERE i.pedido_id = ?`,
      [pedidoId]
    );

    return res.json({
      pedido: pedido[0],
      items
    });

  } catch (error) {
    console.error("Error obteniendo pedido:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

// =======================
// REPORTE DEL DÍA (admin)
// =======================
export async function reporteDelDia(req, res) {
  try {
    // total pedidos del día
    const [totalPedidos] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
    `);

    // ventas totales del día (todos los estados)
    const [ventas] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS ventas_totales
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
    `);

    // ventas reales del día (solo entregados)
    const [ventasEntregadas] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS ventas_entregadas
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      AND estado = 'entregado'
    `);

    // pedidos por estado (solo estados del enum)
    const [estados] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      GROUP BY estado
    `);

    const resumenEstados = {
      pendiente: 0,
      en_proceso: 0,
      entregado: 0,
      cancelado: 0
    };

    estados.forEach(e => {
      if (resumenEstados[e.estado] !== undefined) {
        resumenEstados[e.estado] = e.cantidad;
      }
    });

    // ticket promedio (sobre todos los pedidos del día)
    const totalP = Number(totalPedidos[0].total || 0);
    const ventasTot = Number(ventas[0].ventas_totales || 0);

    const ticketPromedio = totalP > 0 ? ventasTot / totalP : 0;

    return res.json({
      fecha: new Date().toISOString().slice(0, 10),
      total_pedidos: totalP,
      ventas_totales: ventasTot,
      ventas_entregadas: Number(ventasEntregadas[0].ventas_entregadas || 0),
      estados: resumenEstados,
      ticket_promedio: ticketPromedio
    });

  } catch (error) {
    console.error("Error generando reporte del día:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
