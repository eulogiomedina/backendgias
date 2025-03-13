// routes/estados.js
const express = require('express');
const Estado = require('../models/Estado');
const router = express.Router();

// Ruta para obtener los estados desde la base de datos
router.get('/estados', async (req, res) => {
  try {
    const estados = await Estado.find();
    res.json({ estados: estados.map(e => e.estado) });
  } catch (error) {
    console.error('Error al obtener los estados:', error);
    res.status(500).json({ error: 'Error al obtener los estados' });
  }
});

module.exports = router;