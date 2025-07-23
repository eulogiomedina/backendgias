const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const SibApiV3Sdk = require('@sendinblue/client');
const { PasswordChangeAudit } = require('../models/Audit'); // Importar el modelo de auditoría
const router = express.Router();

// Configuración de Brevo (Sendinblue)
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// Ruta para enviar el código de verificación al correo
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

    // Guardar el usuario con el token de restablecimiento
    await user.save();

    // Enviar el correo usando Brevo
    const sendSmtpEmail = {
      to: [{ email: correo }],
      sender: { email: process.env.EMAIL_USER_BREVO, name: 'Grupo GIAS' },
      subject: 'Recuperación de contraseña',
      htmlContent: `<p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
                    <a href="https://forntendgias.vercel.app/reset-password?token=${resetToken}">Restablecer Contraseña</a>`,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({ message: 'Verifica tu correo electrónico' });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    res.status(500).json({ message: 'Error en el servidor', error });
  }
});

// Ruta para restablecer la contraseña
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
      return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la contraseña actual.' });
    }

    // Verificar si la nueva contraseña está en el historial
    const isPasswordInHistory = await Promise.all(
      user.passwords_ant.map(async (oldPasswordHash) => {
        return bcrypt.compare(newPassword, oldPasswordHash);
      })
    );

    if (isPasswordInHistory.includes(true)) {
      return res.status(400).json({ message: 'No puedes usar una contraseña utilizada anteriormente.' });
    }

    // Hashear la nueva contraseña antes de guardarla
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Guardar la contraseña actual en el historial antes de actualizarla
    if (user.passwords_ant.length >= 5) {
      user.passwords_ant.shift(); // Limitar el historial a las últimas 5 contraseñas
    }
    user.passwords_ant.push(user.password); // Agregar la contraseña actual al historial

    // Actualizar la contraseña con la nueva hasheada
    user.password = hashedNewPassword;

    // Limpiar el token y la fecha de expiración
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Guardar el usuario con la nueva contraseña
    await user.save();

    // Registrar el cambio de contraseña en la auditoría
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
