// routes/alexa.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

// 👉 Generador de PIN de 6 dígitos
const generarPin = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /api/alexa/generar-pin/:userId
 * Genera un PIN de 6 dígitos y lo guarda en el usuario
 */
router.post('/generar-pin/:userId', async (req, res) => {
  try {
    const pin = generarPin();
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        pinAlexa: pin,
        pinAlexaActivo: true
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    console.log(`✅ PIN Alexa generado para ${user.correo}: ${pin}`);
    res.json({ pin });
  } catch (err) {
    console.error('❌ Error generando PIN Alexa:', err);
    res.status(500).json({ message: 'Error al generar PIN' });
  }
});

/**
 * POST /api/alexa/validar-pin
 * Valida el PIN que envía Alexa
 * Body: { pin: "123456" }
 */
router.post('/validar-pin', async (req, res) => {
  const { pin } = req.body;
  try {
    console.log(`🔍 Verificando PIN Alexa: ${pin}`);
    const user = await User.findOne({ pinAlexa: pin, pinAlexaActivo: true });
    if (!user) {
      console.warn(`❌ PIN Alexa inválido: ${pin}`);
      return res.status(400).json({ success: false, message: 'PIN inválido' });
    }
    // Opcional: desactivar el PIN tras el primer uso
    user.pinAlexaActivo = false;
    await user.save();
    console.log(`✅ PIN Alexa válido para ${user.correo}`);
    res.json({ success: true, userId: user._id, nombre: user.nombre });
  } catch (err) {
    console.error('❌ Error validando PIN Alexa:', err);
    res.status(500).json({ message: 'Error al validar PIN' });
  }
});

module.exports = router;
