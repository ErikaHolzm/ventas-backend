import db from "../config/db.js";

export async function getUsuarios(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, email FROM usuarios"
    );

    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}

export async function getUsuarioPorId(req, res) {
  try {
    const usuarioId = req.params.id; 

    const [rows] = await db.query(
      "SELECT id, nombre, email FROM usuarios WHERE id = ?",
      [ usuarioId ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function crearUsuario(req, res) {
  try {
    const { nombre, email, contrasena } = req.body;   

    if (!nombre || !email || !contrasena) {     //validamos
      return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)",
      [ nombre, email, contrasena ]   //tomamos los datos del body       
    );

    res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuarioId: result.insertId   
    });

  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function actualizarUsuario(req, res) {
  try {
    const usuarioId = req.params.id;
    const { nombre, email, contrasena } = req.body;

    
    if ( !nombre && !email && !contrasena ) {
      return res.status(400).json({ mensaje: "Debes enviar al menos un campo para actualizar" });
    }

    
    const [result] = await db.query(
      "UPDATE usuarios SET nombre = ?, email = ?, contrasena = ? WHERE id = ?",
      [nombre, email, contrasena, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Usuario actualizado correctamente" });

  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}
export async function eliminarUsuario(req, res) {
  try {
    const usuarioId = req.params.id;

    const [result] = await db.query(
      "UPDATE usuarios SET activo = 0 WHERE id = ?",
      [usuarioId]
    );

    // Si no se modificó ninguna fila el usuario no existe
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    //  se desactivó correctamente
    res.json({ mensaje: "Usuario desactivado correctamente" });

  } catch (error) {
    console.error("Error desactivando usuario:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}



