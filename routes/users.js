const express = require('express');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const router = express.Router();

// Ruta para registrar usuario con validación y verificación de correo
router.post(
  '/register',
  [
    check('nombre').trim().escape().not().isEmpty().withMessage('El nombre es requerido.')
      .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/).withMessage('El nombre solo debe contener letras y espacios'),
    check('apellidos').trim().escape().not().isEmpty().withMessage('Los apellidos son requeridos.')
      .matches(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/).withMessage('Los apellidos solo deben contener letras y espacios'),
    check('correo').isEmail().withMessage('El correo no es válido.').normalizeEmail(),
    check('password').trim().isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
      .matches(/\d/).withMessage('Debe contener al menos un número.')
      .matches(/[A-Z]/).withMessage('Debe contener al menos una letra mayúscula.')
      .matches(/\W/).withMessage('Debe contener al menos un carácter especial.'),
    check('telefono').trim().isNumeric().withMessage('El teléfono solo debe contener números.')
      .isLength({ min: 10, max: 10 }).withMessage('El teléfono debe tener 10 dígitos.'),
    check('ciudad').trim().escape().not().isEmpty().withMessage('La ciudad es requerida.'),
    check('colonia').trim().escape().not().isEmpty().withMessage('La colonia es requerida.'),
    check('calle').trim().escape().not().isEmpty().withMessage('La calle es requerida.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, apellidos, correo, password, telefono, ciudad, colonia, calle } = req.body;

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
        direccion: { ciudad, colonia, calle },
        verificationToken,
        verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 horas de validez
      });

      // Guardar el usuario en la base de datos
      await newUser.save();

      // Configurar y enviar el correo de verificación
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER, // Tu correo de Gmail
          pass: process.env.EMAIL_PASS  // Contraseña de la aplicación o cuenta
        }
      });

      const verificationUrl = `http://localhost:5000/api/users/verify/${verificationToken}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: correo,
        subject: 'GIAS Verificacion de correo',
        text: `Haz clic en el siguiente enlace para verificar tu correo: ${verificationUrl}`,
        html: `<p>Haz clic en el siguiente enlace para verificar tu correo:</p><a href="${verificationUrl}">${verificationUrl}</a>`
      };

      await transporter.sendMail(mailOptions);

      res.status(201).json({ message: 'Usuario registrado. Por favor, verifica tu correo electrónico.' });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      res.status(500).json({ message: 'Error al registrar usuario', error });
    }
  }
);

// Ruta para verificar el correo electrónico
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token, verificationTokenExpires: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Eliminar el token
    user.verificationTokenExpires = undefined; // Eliminar la expiración del token
    await user.save();

    res.status(200).json({ message: '<p>Correo verificado exitosamente, YA PUEDES INICAR SESION</p>' });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    res.status(500).json({ message: 'Error al verificar correo', error });
  }
});

module.exports = router;
