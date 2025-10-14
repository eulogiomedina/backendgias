const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const SibApiV3Sdk = require('@sendinblue/client');
const { PasswordChangeAudit } = require('../models/Audit'); // Auditoría de cambios de contraseña
const router = express.Router();

// Configuración de Brevo (Sendinblue)
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// ==================== ENVIAR CÓDIGO DE RECUPERACIÓN ====================
router.post('/send-code', async (req, res) => {
  const { correo } = req.body;

  try {
    const user = await User.findOne({ correo });
    if (!user) {
      return res.status(400).json({ message: 'No existe una cuenta con este correo.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hora de expiración

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Enviar correo con enlace de restablecimiento
    const sendSmtpEmail = {
      to: [{ email: correo }],
      sender: { email: process.env.EMAIL_USER_BREVO, name: 'Grupo GIAS' },
      subject: 'Recuperación de contraseña',
      htmlContent: `
        <p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
        <a href="https://forntendgias.vercel.app/reset-password?token=${resetToken}">
          Restablecer Contraseña
        </a>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: 'Verifica tu correo electrónico' });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ message: 'Error en el servidor', error });
  }
});

// ==================== RESTABLECER CONTRASEÑA ====================
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
    }

    // Verificar si la nueva contraseña es igual a la actual
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({
        message: 'La nueva contraseña no puede ser igual a la contraseña actual.',
      });
    }

    // Verificar si la nueva contraseña está en el historial
    const isPasswordInHistory = await Promise.all(
      user.passwords_ant.map(async (oldPasswordHash) =>
        bcrypt.compare(newPassword, oldPasswordHash)
      )
    );

    if (isPasswordInHistory.includes(true)) {
      return res.status(400).json({
        message: 'No puedes usar una contraseña utilizada anteriormente.',
      });
    }

    // ⚠️ NO HASHES AQUÍ — el modelo se encarga de hacerlo automáticamente
    // user.password = await bcrypt.hash(newPassword, 10);

    // Asignar directamente la nueva contraseña en texto plano
    user.password = newPassword;

    // Limpiar token y expiración
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Guardar cambios (el pre('save') del modelo se encarga del hash y del historial)
    await user.save();

    // Registrar auditoría
    await PasswordChangeAudit.create({
      nombreCompleto: `${user.nombre} ${user.apellidos}`,
      correo: user.correo,
      contraseñaAnterior: user.passwords_ant[user.passwords_ant.length - 1],
      nuevaContraseña: user.password,
    });

    res.status(200).json({ message: 'Contraseña cambiada con éxito.' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor', error });
  }
});

module.exports = router;
