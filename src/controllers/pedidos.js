import db from "../config/db.js";

const ESTADOS_VALIDOS = ["pendiente", "en_proceso", "entregado", "cancelado"];


export async function crearPedido(req, res) {
  const conn = await db.getConnection();

  try {
    const { items } = req.body;

     
    const usuario_id = req.usuario?.id;

    if (!usuario_id) {
      return res.status(401).json({ mensaje: "Usuario no identificado en token" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ mensaje: "Faltan items del pedido" });
    }

     
    for (const item of items) {
      if (!item.producto_id || !item.cantidad || Number(item.cantidad) <= 0) {
        return res.status(400).json({ mensaje: "Items inválidos" });
      }
    }

     
    await conn.beginTransaction();


    
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

    
    const total = items.reduce((sum, item) => {
      return sum + precios.get(item.producto_id) * Number(item.cantidad);
    }, 0);

    
    const [pedidoResult] = await conn.query(
      "INSERT INTO pedidos (usuario_id, total, creado_en, estado) VALUES (?, ?, NOW(), 'pendiente')",
      [usuario_id, total]
    );

    const pedidoId = pedidoResult.insertId;

    
    for (const item of items) {
      const precio = precios.get(item.producto_id);
      const subtotal = precio * Number(item.cantidad);

      await conn.query(
        `INSERT INTO items_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.cantidad, precio, subtotal]
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


export async function obtenerPedidos(req, res) {
  try {
    const rol = req.usuario?.rol; // respetamos tu estructura

    let query = "SELECT id, usuario_id, total, creado_en, estado, pagado, metodo_pago, pagado_en FROM pedidos";

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


export async function cambiarEstadoPedido(req, res) {
  try {
    const pedidoId = req.params.id;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        mensaje: `Estado inválido. Usá: ${ESTADOS_VALIDOS.join(", ")}`
      });
    }

    // ✅ Regla: NO se puede entregar si no está pagado
    if (estado === "entregado") {
      const [rows] = await db.query(
        "SELECT pagado, estado FROM pedidos WHERE id = ?",
        [pedidoId]
      );

      if (!rows.length) return res.status(404).json({ mensaje: "Pedido no encontrado" });

      if (rows[0].estado === "cancelado") {
        return res.status(400).json({ mensaje: "No se puede entregar un pedido CANCELADO" });
      }

      if (Number(rows[0].pagado) !== 1) {
        return res.status(400).json({ mensaje: "No se puede ENTREGAR: el pedido NO está pagado" });
      }
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


export async function reporteDelDia(req, res) {
  try {
    // Pedidos del día (todos)
    const [totalPedidosRows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
    `);

    // Pedidos cobrados del día
    const [cobradosRows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
        AND pagado = 1
    `);

    // Total vendido REAL (solo cobrados)
    const [ventasCobradasRows] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
        AND pagado = 1
    `);

    // Total entregado (logística)
    const [ventasEntregadasRows] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
        AND estado = 'entregado'
    `);

    // Por estado
    const [estadosRows] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      GROUP BY estado
    `);

    const estados = {
      pendiente: 0,
      en_proceso: 0,
      entregado: 0,
      cancelado: 0
    };

    estadosRows.forEach((e) => {
      if (estados[e.estado] !== undefined) {
        estados[e.estado] = Number(e.cantidad || 0);
      }
    });

    //  Por método de pago (solo cobrados)
    const [porMetodoRows] = await db.query(`
      SELECT
        metodo_pago,
        COUNT(*) AS cantidad,
        COALESCE(SUM(total), 0) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
        AND pagado = 1
      GROUP BY metodo_pago
    `);

    // lo dejamos armado para el front
    const por_metodo = {
      efectivo: { cantidad: 0, total: 0 },
      debito: { cantidad: 0, total: 0 },
      credito: { cantidad: 0, total: 0 },
      transferencia: { cantidad: 0, total: 0 }
    };

    porMetodoRows.forEach((r) => {
      const mp = String(r.metodo_pago || "").toLowerCase();
      if (por_metodo[mp]) {
        por_metodo[mp] = {
          cantidad: Number(r.cantidad || 0),
          total: Number(r.total || 0)
        };
      }
    });

    return res.json({
      fecha: new Date().toISOString().slice(0, 10),

      total_pedidos: Number(totalPedidosRows[0]?.total || 0),
      pedidos_cobrados: Number(cobradosRows[0]?.total || 0),

      // (total de ventas del día)
      ventas_cobradas: Number(ventasCobradasRows[0]?.total || 0),

      // opcional
      ventas_entregadas: Number(ventasEntregadasRows[0]?.total || 0),

      estados,
      por_metodo
    });
  } catch (error) {
    console.error("Error generando reporte del día:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function resumenDelDia(req, res) {
  try {
    const rol = req.usuario?.rol;
    const usuario_id = req.usuario?.id;

    // ✅ si es cajero, mostramos SOLO sus ventas del día
    const filtroUsuario = rol === "cajero" ? " AND usuario_id = ? " : "";
    const params = rol === "cajero" ? [usuario_id] : [];

    // 1) total de pedidos del día
    const [totalPedidos] = await db.query(`
      SELECT COUNT(*) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      ${filtroUsuario}
    `, params);

    // 2) total cobrado del día (pagado=1)
    const [ventasCobradas] = await db.query(`
      SELECT COALESCE(SUM(total), 0) AS total
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
        AND pagado = 1
      ${filtroUsuario}
    `, params);

    // 3) estados del día (para mini resumen)
    const [estadosRows] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM pedidos
      WHERE DATE(creado_en) = CURDATE()
      ${filtroUsuario}
      GROUP BY estado
    `, params);

    const resumenEstados = {
      pendiente: 0,
      en_proceso: 0,
      entregado: 0,
      cancelado: 0
    };

    estadosRows.forEach((e) => {
      if (resumenEstados[e.estado] !== undefined) {
        resumenEstados[e.estado] = Number(e.cantidad || 0);
      }
    });

    return res.json({
      fecha: new Date().toISOString().slice(0, 10),
      ventas: Number(totalPedidos[0]?.total || 0),
      total: Number(ventasCobradas[0]?.total || 0),
      estados: resumenEstados
    });
  } catch (error) {
    console.error("Error resumenDelDia:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

export async function cobrarPedido(req, res) {
  try {
    const pedidoId = req.params.id;
    const { metodo_pago } = req.body;

    const validos = ["efectivo", "debito", "credito", "transferencia"];
    if (!validos.includes(metodo_pago)) {
      return res.status(400).json({ mensaje: "Método de pago inválido" });
    }

    const [rows] = await db.query(
      "SELECT estado, pagado FROM pedidos WHERE id = ?",
      [pedidoId]
    );

    if (!rows.length) return res.status(404).json({ mensaje: "Pedido no encontrado" });

    if (Number(rows[0].pagado) === 1) {
      return res.status(400).json({ mensaje: "Ese pedido ya está pagado" });
    }

    // ✅ COBRAR ANTES: solo bloqueo si está cancelado
    if (rows[0].estado === "cancelado") {
      return res.status(400).json({ mensaje: "No se puede cobrar un pedido CANCELADO" });
    }

    await db.query(
      "UPDATE pedidos SET pagado = 1, pagado_en = NOW(), metodo_pago = ? WHERE id = ?",
      [metodo_pago, pedidoId]
    );

    return res.json({ mensaje: "Pedido cobrado", pedidoId, metodo_pago, pagado: 1 });
  } catch (error) {
    console.error("Error cobrarPedido:", error);
    return res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
