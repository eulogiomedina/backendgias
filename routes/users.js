const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const router = express.Router();

// Ruta para registrar usuario
router.post('/register', async (req, res) => {
  const { nombre, apellidos, correo, password, telefono, estado, municipio, colonia } = req.body;//modificado datos

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
      direccion: { estado, municipio, colonia },//modificado datos
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000, // Validez de 24 horas
    });

    // Guardar el usuario en la base de datos
    await newUser.save();

    // Configurar y enviar el correo de verificación
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Tu correo de Gmail
        pass: process.env.EMAIL_PASS, // Contraseña de la aplicación o cuenta
      },
    });

    const verificationUrl = `https://backendgias.onrender.com/api/users/verify/${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'GIAS Verificación de correo',
      text: `Haz clic en el siguiente enlace para verificar tu correo: ${verificationUrl}`,
      html: `<p>Haz clic en el siguiente enlace para verificar tu correo:</p><a href="${verificationUrl}">${verificationUrl}</a>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Usuario registrado. Por favor, verifica tu correo electrónico.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ message: 'Error al registrar usuario', error });
  }
});

// Ruta para verificar el correo electrónico
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
    user.verificationToken = undefined; // Eliminar el token
    user.verificationTokenExpires = undefined; // Eliminar la expiración del token
    await user.save();

    res.status(200).json({ message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    res.status(500).json({ message: 'Error al verificar correo', error });
  }
});

module.exports = router;
