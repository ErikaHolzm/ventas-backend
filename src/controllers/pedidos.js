import db from "../config/db.js";

export async function crearPedido(req, res) {
  try {
    const { usuario_id, items } = req.body;

    if (!usuario_id || !items || items.length === 0) {
      return res.status(400).json({ mensaje: "Faltan datos del pedido" });
    }

    //calcular total
    const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

    // insertar pedido
    const [pedidoResult] = await db.query(
      "INSERT INTO pedidos (usuario_id, total, estado) VALUES (?, ?, 'pendiente')",
      [usuario_id, total]
    );

    const pedidoId = pedidoResult.insertId;

    // insertar detalles
    for (const item of items) {
      await db.query(
        "INSERT INTO pedido_detalle (pedido_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)",
        [pedidoId, item.producto_id, item.cantidad, item.precio]
      );
    }

    res.status(201).json({
      mensaje: "Pedido creado correctamente",
      pedidoId,
      total,
      estado: "pendiente"
    });

  } catch (error) {
    console.error("Error creando pedido:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function obtenerPedidos(req, res) {
  try {
    const rol = req.usuario.rol;

    let query = "SELECT * FROM pedidos";

    if (rol === "cocina") {
      query = "SELECT * FROM pedidos WHERE estado IN ('pendiente', 'en_cocina')";
    }

    const [rows] = await db.query(query);

    res.json(rows);

  } catch (error) {
    console.error("Error obteniendo pedidos:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function cambiarEstadoPedido(req, res) {
  try {
    const pedidoId = req.params.id;
    const { estado } = req.body;

    const estadosValidos = ["pendiente", "en_cocina", "listo", "entregado", "cancelado"];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ mensaje: "Estado inválido" });
    }

    const [result] = await db.query(
      "UPDATE pedidos SET estado = ? WHERE id = ?",
      [estado, pedidoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }

    res.json({ mensaje: "Estado actualizado correctamente" });

  } catch (error) {
    console.error("Error cambiando estado:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


export async function obtenerPedidoPorId(req, res) {
  try {
    const pedidoId = req.params.id;

    // buscar el pedido
    const [pedido] = await db.query(
      "SELECT * FROM pedidos WHERE id = ?",
      [pedidoId]
    );

    if (pedido.length === 0) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }

    // buscar detalles + nombre de productos
    const [items] = await db.query(
      `SELECT pd.producto_id, p.nombre AS producto, pd.cantidad, pd.precio 
       FROM pedido_detalle pd
       JOIN productos p ON p.id = pd.producto_id
       WHERE pd.pedido_id = ?`,
      [pedidoId]
    );

    // devolver todo junto
    res.json({
      pedido: pedido[0],
      items
    });

  } catch (error) {
    console.error("Error obteniendo pedido:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
  

export async function reporteDelDia(req, res) {
  try {
    // total de pedidos del día
    const [totalPedidos] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
    `);

    // total de ventas del día
    const [ventas] = await db.query(`
      SELECT SUM(total) AS ventas_totales
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
    `);

    // cantidad de pedidos por estado
    const [estados] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      GROUP BY estado
    `);

    // convertir a objeto más cómodo
    const resumenEstados = {
      pendiente: 0,
      en_cocina: 0,
      listo: 0,
      entregado: 0,
      cancelado: 0
    };

    estados.forEach(e => {
      resumenEstados[e.estado] = e.cantidad;
    });

    // ticket promedio  
    const ticketPromedio =
      ventas[0].ventas_totales && totalPedidos[0].total > 0
        ? ventas[0].ventas_totales / totalPedidos[0].total
        : 0;

     
    res.json({
      fecha: new Date().toISOString().slice(0, 10),
      total_pedidos: totalPedidos[0].total,
      ventas_totales: ventas[0].ventas_totales ?? 0,
      estados: resumenEstados,
      ticket_promedio: ticketPromedio
    });

  } catch (error) {
    console.error("Error generando reporte del día:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}


