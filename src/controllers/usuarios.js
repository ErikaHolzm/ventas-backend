import db from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


function esContrasenaFuerte(contrasena) {
  // al menos 8 caracteres, una minúscula, una mayúscula y un número
  const patron = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return patron.test(contrasena);
}


export async function getUsuarios(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT id, nombre, email FROM usuarios WHERE activo = 1"
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
      "SELECT id, nombre, email FROM usuarios WHERE id = ? AND activo = 1",
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
    
    const [rows] = await db.query("SELECT email FROM usuarios WHERE email = ?",
        [ email ]
    );
    
    if (rows.length > 0){
        return res.status(400).json ({mensaje: "Email ya registrado"})
    }
    
    if (!nombre || !email || !contrasena) {     //validamos
      return res.status(400).json({ mensaje: "Faltan campos obligatorios" });
    }

    if (!esContrasenaFuerte(contrasena)) {
        return res.status(400).json({ mensaje: "Contraseña débil" });
    }

    // Encriptar contraseña
    const contrasenaEncriptada = await bcrypt.hash(contrasena, 10);

    const [result] = await db.query(
      "INSERT INTO usuarios (nombre, email, contrasena) VALUES (?, ?, ?)",
      [ nombre, email, contrasenaEncriptada ]   //tomamos los datos del body       
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

export async function loginUsuario(req, res) {
  try {
    const { email, contrasena } = req.body;

    //validar campos vacíos
    if (!email || !contrasena) {
      return res.status(400).json({ mensaje: "Email y contraseña son obligatorios" });
    }

    // buscar usuario por email
    const [rows] = await db.query(
      "SELECT * FROM usuarios WHERE email = ? AND activo = 1",
      [email]
    );

    // si no existe el usuario
    if (rows.length === 0) {
      return res.status(400).json({ mensaje: "Credenciales inválidas" });
    }

    // comparar contraseñas
    const passwordValida = await bcrypt.compare(contrasena, rows[0].contrasena);
    if (!passwordValida) {
      return res.status(400).json({ mensaje: "Credenciales inválidas" });
    }

        // generar token
        const token = jwt.sign(
        {
            id: rows[0].id,
            nombre: rows[0].nombre,
            rol: rows[0].rol
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
        );

    // respuesta final
    res.json({
        mensaje: "Login exitoso",
        token,
        usuario: {
            id: rows[0].id,
            nombre: rows[0].nombre,
            email: rows[0].email,
            rol: rows[0].rol  
        }
    });


  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
}





