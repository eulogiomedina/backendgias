const express = require('express');
const router = express.Router();
const { enviarRecordatorioPago } = require('../utils/emailService');
const Usuario = require('../models/User');
const Tanda = require('../models/Tanda');

// Ruta para enviar recordatorio de pago
router.post('/recordatorio', async (req, res) => {
  try {
    const { userId, tandaId, fechaProximoPago } = req.body;
    const usuario = await Usuario.findById(userId);
    const tanda = await Tanda.findById(tandaId);
    if (!usuario || !tanda) {
      return res.status(404).json({ message: 'Usuario o tanda no encontrados' });
    }
    await enviarRecordatorioPago(usuario, tanda, new Date(fechaProximoPago));
    res.json({ message: 'Recordatorio enviado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error enviando recordatorio', error });
  }
});

module.exports = router;
