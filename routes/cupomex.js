const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// Ruta para obtener colonias y calles basadas en la ciudad
router.get('/address', async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ message: 'Se requiere el nombre de la ciudad.' });
  }

  try {
    const response = await fetch(`https://api.cupomex.mx/api/v1/cities/${city}`, {
      headers: {
        Authorization: `Token ${process.env.CUPOMEX_API_KEY}`, // Clave de API de CupoMex desde el archivo .env
      },
    });

    if (!response.ok) {
      throw new Error('Error al conectar con CupoMex.');
    }

    const data = await response.json();

    // Respuesta esperada: colonias (neighborhoods) y calles (streets)
    const neighborhoods = data.neighborhoods?.map((n) => n.name) || [];
    const streets = data.streets || [];

    res.status(200).json({ neighborhoods, streets });
  } catch (error) {
    console.error('Error al obtener datos de CupoMex:', error);
    res.status(500).json({ message: 'Error al obtener datos de CupoMex.' });
  }
});

module.exports = router;
