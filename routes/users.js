const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const router = express.Router();
const { verifyAccessToken } = require('../middlewares/accessTokenMiddleware');
const SibApiV3Sdk = require('@sendinblue/client'); // Cliente oficial de Brevo

// Configuración de Brevo (Sendinblue)
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

// ========================= REGISTRO =========================
router.post('/register', async (req, res) => {
  const { nombre, apellidos, correo, password, telefono, estado, municipio, colonia } = req.body;

  try {
    // Verificar si el correo ya está registrado
    const existingUser = await User.findOne({ correo });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    // Generar un token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      nombre,
      apellidos,
      correo,
      password,
      telefono,
      direccion: { estado, municipio, colonia },
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    // Guardar el usuario
    await newUser.save();

    // URL para verificar
    const verificationUrl = `https://backendgias.onrender.com/api/users/verify/${verificationToken}`;

    // === Enviar correo con Brevo ===
    const sendSmtpEmail = {
      to: [{ email: correo, name: `${nombre} ${apellidos}` }],
      sender: { email: process.env.EMAIL_USER_BREVO, name: "Grupo GIAS" },
      subject: "GIAS - Verificación de correo",
      htmlContent: `
        <h2>¡Hola ${nombre}!</h2>
        <p>Gracias por registrarte en <b>GIAS</b>.</p>
        <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
        <a href="${verificationUrl}" target="_blank">${verificationUrl}</a>
        <br><br>
        <p>Este enlace expira en 24 horas.</p>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(201).json({
      message: 'Usuario registrado. Hemos enviado un correo de verificación. Revisa tu bandeja antes de iniciar sesión.'
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error al registrar usuario', error });
  }
});

// ========================= VERIFICAR TOKEN =========================
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    res.status(500).json({ message: 'Error al verificar correo', error });
  }
});

// ========================= LISTAR USUARIOS =========================
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

module.exports = router;
