// routes/contact.js
const express = require('express');
const ContactInfo = require('../models/ContactInfo');
const router = express.Router();

// Ruta para obtener la información de contacto
router.get('/contact-info', async (req, res) => {
  try {
    const info = await ContactInfo.findOne(); // Asume que solo hay un documento
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la información de contacto' });
  }
});

// Ruta para actualizar la información de contacto
router.put('/contact-info', async (req, res) => {
  const { direccion, correo, telefono } = req.body;
  try {
    const info = await ContactInfo.findOneAndUpdate(
      {},
      { direccion, correo, telefono },
      { new: true, upsert: true } // Crea un nuevo documento si no existe
    );
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la información de contacto' });
  }
});

module.exports = router;
