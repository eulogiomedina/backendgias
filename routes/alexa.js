// routes/alexa.js
const express = require('express');
const mongoose = require('mongoose');
const { verifyAccessToken } = require('../middlewares/accessTokenMiddleware');
const User = require('../models/User');
const Tanda = require('../models/Tanda');
const Pago = require('../models/Pago');

const router = express.Router();

// GET /api/alexa/me
router.get('/me', verifyAccessToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('nombre');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ nombre: user.nombre });
  } catch (err) {
    console.error('Error al obtener nombre de usuario:', err);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/alexa/proxima-fecha
router.get('/proxima-fecha', verifyAccessToken, async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    const tandas = await Tanda.find({ 'fechasPago.userId': userObjectId });

    // Extraer todas las fechas de pago del usuario
    let fechasPendientes = [];
    tandas.forEach(t => {
      fechasPendientes.push(
        ...t.fechasPago.filter(f => f.userId.equals(userObjectId) && f.fechaPago)
      );
    });

    // Filtrar las que ya fueron pagadas
    const historial = await Pago.find({ userId: userObjectId }).select('fechaPago');
    fechasPendientes = fechasPendientes.filter(f =>
      !historial.some(h =>
        new Date(h.fechaPago).getTime() === new Date(f.fechaPago).getTime()
      )
    );

    // Ordenar ascendente y devolver la primera
    fechasPendientes.sort((a, b) =>
      new Date(a.fechaPago) - new Date(b.fechaPago)
    );

    if (fechasPendientes.length === 0) {
      return res.status(404).json({ message: 'No hay fechas pendientes.' });
    }

    res.json({ proximaFechaPago: fechasPendientes[0].fechaPago });
  } catch (err) {
    console.error('Error al buscar próxima fecha de pago:', err);
    res.status(500).json({ message: 'Error al buscar próxima fecha de pago' });
  }
});

module.exports = router;
