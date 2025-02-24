const express = require("express");
const router = express.Router();
const User = require("../models/User");
const AhorroUsuario = require("../models/AhorroUsuario");
const mongoose = require("mongoose");

// 📌 Ruta para obtener el perfil del usuario
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    // 📌 Validar si el ID es válido en MongoDB
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
    }

    try {
        // 📌 Buscar usuario en la base de datos
        const usuario = await User.findById(userId).select("nombre apellidos correo telefono fotoPerfil");

        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // 📌 Buscar los ahorros del usuario
        const ahorros = await AhorroUsuario.find({ userId });

        res.json({ usuario, ahorros });
    } catch (error) {
        console.error("❌ Error al obtener el perfil:", error);
        res.status(500).json({ message: "Error en el servidor." });
    }
});

module.exports = router;
