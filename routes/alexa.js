// routes/alexa.js
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

// Modelos
const User        = require('../models/User');
const Tanda       = require('../models/Tanda');
const Pago        = require('../models/Pago');
const ContactInfo = require('../models/ContactInfo');

// 👉 Generador de PIN de 6 dígitos
const generarPin = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /api/alexa/generar-pin/:userId
 */
router.post('/generar-pin/:userId', async (req, res) => {
  try {
    const pin = generarPin();
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { pinAlexa: pin, pinAlexaActivo: true },
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
    // Desactivar el PIN tras el primer uso
    user.pinAlexaActivo = false;
    await user.save();
    console.log(`✅ PIN Alexa válido para ${user.correo}`);
    res.json({ success: true, userId: user._id, nombre: user.nombre });
  } catch (err) {
    console.error('❌ Error validando PIN Alexa:', err);
    res.status(500).json({ message: 'Error al validar PIN' });
  }
});

/**
 * GET /api/alexa/nombre/:userId
 */
router.get('/nombre/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('nombre apellidos');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ nombre: user.nombre, apellidos: user.apellidos });
  } catch (err) {
    console.error('❌ Error obteniendo nombre de usuario:', err);
    res.status(500).json({ message: 'Error al obtener nombre de usuario' });
  }
});

/**
 * GET /api/alexa/proxima-fecha/:userId
 */
router.get('/proxima-fecha/:userId', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const tandas = await Tanda.find({ 'fechasPago.userId': userId });

    let fechasPrevistas = [];
    tandas.forEach(t => {
      fechasPrevistas.push(
        ...t.fechasPago
           .filter(f => f.userId.equals(userId) && f.fechaPago)
           .map(f => f.fechaPago)
      );
    });

    const pagosRealizados = await Pago.find({ userId }).select('fechaPago').lean();
    const fechasPagadas = pagosRealizados.map(p => p.fechaPago.toISOString());

    const pendientes = fechasPrevistas
      .map(d => d.toISOString())
      .filter(f => !fechasPagadas.includes(f))
      .map(s => new Date(s));

    if (!pendientes.length) {
      return res.status(404).json({ message: 'No hay fechas de pago pendientes.' });
    }

    pendientes.sort((a, b) => a - b);
    res.json({ proximaFechaPago: pendientes[0] });
  } catch (err) {
    console.error('Error obteniendo próxima fecha de pago:', err);
    res.status(500).json({ message: 'Error interno al calcular próxima fecha.' });
  }
});

/**
 * GET /api/alexa/admin-contact
 */
router.get('/admin-contact', async (req, res) => {
  try {
    const info = await ContactInfo.findOne().lean();
    if (!info) {
      return res.status(404).json({ message: 'Información de contacto no encontrada' });
    }
    res.json({ correo: info.correo, telefono: info.telefono });
  } catch (err) {
    console.error('❌ Error obteniendo contacto admin:', err);
    res.status(500).json({ message: 'Error al obtener contacto del administrador' });
  }
});

module.exports = router;
