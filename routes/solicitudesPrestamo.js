const express = require('express');
const router = express.Router();
const SolicitudPrestamo = require('../models/SolicitudPrestamo');

// POST: Crear nueva solicitud de préstamo
router.post('/', async (req, res) => {
  try {
    const solicitud = new SolicitudPrestamo(req.body);
    const saved = await solicitud.save();
    res.status(201).json({ message: 'Solicitud creada con éxito', data: saved });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ message: 'Error del servidor', error });
  }
});

// GET: Obtener todas las solicitudes o filtradas por estado
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query;

    const filtro = estado ? { status: estado } : {};

    const solicitudes = await SolicitudPrestamo.find(filtro).sort({ createdAt: -1 });
    res.status(200).json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ message: 'Error al obtener las solicitudes', error });
  }
});

module.exports = router;
