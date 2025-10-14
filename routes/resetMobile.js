const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const SibApiV3Sdk = require("@sendinblue/client");
const User = require("../models/User");

// Configuración del cliente de Brevo (Sendinblue)
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Guardar temporalmente los códigos (solo válidos mientras el servidor está activo)
const mobileCodes = new Map();

/**
 * 📤 Enviar código de recuperación (Versión Móvil)
 * Endpoint: /api/reset-mobile/enviar-codigo
 */
router.post("/enviar-codigo", async (req, res) => {
  const { correo } = req.body;

  try {
    const user = await User.findOne({ correo });
    if (!user)
      return res.status(404).json({ message: "No existe un usuario con ese correo" });

    const code = crypto.randomInt(100000, 999999).toString();
    mobileCodes.set(correo, code);

    await apiInstance.sendTransacEmail({
      sender: { email: "no-reply@giasapp.com", name: "GIAS Móvil" },
      to: [{ email: correo }],
      subject: "Código de recuperación de contraseña - GIAS Móvil",
      htmlContent: `
        <div style="font-family:sans-serif; padding:15px;">
          <h2>Recuperación de contraseña</h2>
          <p>Hola ${user.nombre || "usuario"},</p>
          <p>Tu código de recuperación es:</p>
          <h1 style="color:#0F2B45;">${code}</h1>
          <p>Este código expira en pocos minutos.</p>
          <br/>
          <p>Atentamente,</p>
          <strong>Equipo GIAS Móvil</strong>
        </div>
      `,
    });

    res.json({ message: "Código enviado correctamente a tu correo 📩" });
  } catch (error) {
    console.error("❌ Error al enviar código móvil:", error);
    res.status(500).json({ message: "Error al enviar el código de recuperación" });
  }
});

/**
 * ✅ Verificar código de recuperación
 * Endpoint: /api/reset-mobile/verificar-codigo
 */
router.post("/verificar-codigo", (req, res) => {
  const { correo, codigo } = req.body;
  const savedCode = mobileCodes.get(correo);

  if (!savedCode || savedCode !== codigo) {
    return res.status(400).json({ message: "Código inválido o expirado" });
  }

  res.json({ message: "Código verificado correctamente ✅" });
});

/**
 * 🔑 Cambiar contraseña (solo si el código es correcto)
 * Endpoint: /api/reset-mobile/cambiar-contrasena
 */
router.post("/cambiar-contrasena", async (req, res) => {
  const { correo, codigo, nuevaContrasena } = req.body;
  const savedCode = mobileCodes.get(correo);

  if (!savedCode || savedCode !== codigo) {
    return res.status(400).json({ message: "Código inválido o expirado" });
  }

  try {
    const hashed = await bcrypt.hash(nuevaContrasena, 10);
    const user = await User.findOneAndUpdate({ correo }, { password: hashed });

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    mobileCodes.delete(correo);
    res.json({ message: "Contraseña actualizada correctamente ✅" });
  } catch (error) {
    console.error("❌ Error al cambiar contraseña móvil:", error);
    res.status(500).json({ message: "Error al actualizar la contraseña" });
  }
});

module.exports = router;
