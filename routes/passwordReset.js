const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcrypt');
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
    console.log('Usuario guardado con éxito:', user);

    // Enviar el correo usando Brevo
    const sendSmtpEmail = {
      to: [{ email: correo }],
      sender: { email: process.env.EMAIL_USER_BREVO, name: 'Grupo GIAS' },
      subject: 'Recuperación de contraseña',
      htmlContent: `<p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
                    <a href="http://localhost:3000/reset-password?token=${resetToken}">Restablecer Contraseña</a>`,
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

  console.log('Token recibido:', token);  // Verificación de token
  console.log('Nueva contraseña recibida:', newPassword);  // Verificación de nueva contraseña

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('No se encontró el usuario con ese token');  // Debugging del usuario no encontrado
      return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
    }

    console.log('Usuario encontrado:', user);

    // Almacenar la contraseña anterior
    const oldPassword = user.password;

    // Hashear la nueva contraseña
    user.password = newPassword;
    
    // Limpiar el token y la fecha de expiración
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    console.log('Contraseña hasheada antes de guardar:', user.password);

    // Guardar el usuario con la nueva contraseña
    await user.save();
    console.log('Contraseña cambiada y usuario guardado:', user);

    // Registrar el cambio de contraseña en la auditoría
    await PasswordChangeAudit.create({
      nombreCompleto: `${user.nombre} ${user.apellidos}`, // Concatenar nombre y apellidos
      correo: user.correo,
      contraseñaAnterior: oldPassword, // Almacena la contraseña anterior (en texto plano)
      nuevaContraseña: user.password, // Almacena la nueva contraseña (ya hasheada)
    });

    res.status(200).json({ message: 'Contraseña cambiada con éxito.' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor', error });
  }
});

module.exports = router;
