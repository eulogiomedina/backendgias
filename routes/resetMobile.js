const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const SibApiV3Sdk = require("@sendinblue/client");
const User = require("../models/User");

// ⚙️ Configuración del cliente de Brevo (Sendinblue)
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// 🧠 Guardar temporalmente los códigos con expiración (en memoria)
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

    // Generar un código aleatorio de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();

    // Guardar código temporalmente con expiración de 5 minutos
    mobileCodes.set(correo, code);
    setTimeout(() => mobileCodes.delete(correo), 5 * 60 * 1000); // 5 minutos

    // 💌 Formato SMTP estándar (igual que en la versión web)
    const sendSmtpEmail = {
      to: [{ email: correo }],
      sender: { email: process.env.EMAIL_USER_BREVO, name: "Grupo GIAS" },
      subject: "Código de recuperación de contraseña - GIAS Móvil",
      htmlContent: `
        <div style="font-family:sans-serif; padding:15px; background-color:#f6f6f6;">
          <h2 style="color:#0F2B45;">Recuperación de contraseña</h2>
          <p>Hola ${user.nombre || "usuario"},</p>
          <p>Tu código de recuperación es:</p>
          <h1 style="color:#0F2B45; text-align:center;">${code}</h1>
          <p>Este código es válido por <strong>5 minutos</strong>.</p>
          <p>Si no solicitaste el restablecimiento, ignora este mensaje.</p>
          <br/>
          <p>Atentamente,</p>
          <strong>Equipo GIAS Móvil</strong>
        </div>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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

  if (!savedCode || savedCode !== codigo)
    return res.status(400).json({ message: "Código inválido o expirado" });

  res.json({ message: "Código verificado correctamente ✅" });
});

/**
 * 🔑 Cambiar contraseña (usa el hook del modelo para hashear)
 * Endpoint: /api/reset-mobile/cambiar-contrasena
 */
router.post("/cambiar-contrasena", async (req, res) => {
  const { correo, codigo, nuevaContrasena } = req.body;
  const savedCode = mobileCodes.get(correo);

  if (!savedCode || savedCode !== codigo)
    return res.status(400).json({ message: "Código inválido o expirado" });

  try {
    // Buscar el usuario
    const user = await User.findOne({ correo });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    // Actualizar la contraseña sin hashear (el hook 'pre save' lo hará)
    user.password = nuevaContrasena;
    await user.save();

    // Eliminar el código temporal una vez usado
    mobileCodes.delete(correo);

    res.json({ message: "Contraseña actualizada correctamente ✅" });
  } catch (error) {
    console.error("❌ Error al cambiar contraseña móvil:", error);
    res.status(500).json({ message: "Error al actualizar la contraseña" });
  }
});

module.exports = router;
