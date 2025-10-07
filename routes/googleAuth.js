const express = require("express");
const User = require("../models/User");

const router = express.Router();

/**
 * ============================================================
 * 🔐 RUTA: /api/google/check-user
 * Función: Verifica si un usuario con cuenta de Google existe.
 * Si el correo existe → devuelve los datos del usuario.
 * Si no existe → responde 404 para que el frontend lo mande a registrarse.
 * ============================================================
 */

router.post("/check-user", async (req, res) => {
  try {
    const { email } = req.body;

    // Validación inicial
    if (!email) {
      return res
        .status(400)
        .json({ message: "No se recibió el correo de Google." });
    }

    console.log("📩 Intento de inicio con Google:", email);

    // Buscar usuario en la base de datos
    const user = await User.findOne({ correo: email });

    if (!user) {
      console.log("⚠️ Usuario no registrado:", email);
      return res.status(404).json({
        message: "El correo no está registrado. Redirigir al formulario de registro.",
      });
    }

    console.log("✅ Usuario encontrado:", user.nombre || email);

    // Si existe, devolver sus datos
    return res.status(200).json({
      message: "Inicio de sesión con Google exitoso",
      user,
    });
  } catch (error) {
    console.error("❌ Error en /api/google/check-user:", error);
    return res
      .status(500)
      .json({ message: "Error interno del servidor", error });
  }
});

module.exports = router;
