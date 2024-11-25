const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// Ruta para obtener todos los estados
router.get('/estados', async (req, res) => {
  try {
    const response = await fetch(`https://api.copomex.com/query/get_estados?token=${process.env.CUPOMEX_API_KEY}`);

    if (!response.ok) {
      throw new Error('Error al conectar con la API de Copomex.');
    }

    const data = await response.json();
    const estados = data.response.estado; // La API devuelve los estados en esta propiedad
    res.status(200).json({ estados });
  } catch (error) {
    console.error('Error al obtener estados:', error);
    res.status(500).json({ message: 'Error al obtener los estados.' });
  }
});

// Ruta para obtener municipios basados en el estado
router.get('/municipios', async (req, res) => {
  const { estado } = req.query;

  if (!estado) {
    return res.status(400).json({ message: 'Se requiere el nombre del estado.' });
  }

  try {
    const response = await fetch(
      `https://api.copomex.com/query/get_municipio_por_estado/${encodeURIComponent(estado)}?token=${process.env.CUPOMEX_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Error al conectar con la API de Copomex.');
    }

    const data = await response.json();
    const municipios = data.response.municipios; // La API devuelve los municipios en esta propiedad
    res.status(200).json({ municipios });
  } catch (error) {
    console.error('Error al obtener municipios:', error);
    res.status(500).json({ message: 'Error al obtener los municipios.' });
  }
});

// Ruta para obtener colonias basadas en el municipio
router.get('/colonias', async (req, res) => {
  const { municipio } = req.query;

  if (!municipio) {
    return res.status(400).json({ message: 'Se requiere el nombre del municipio.' });
  }

  try {
    const response = await fetch(
      `https://api.copomex.com/query/get_colonia_por_municipio/${encodeURIComponent(municipio)}?token=${process.env.CUPOMEX_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Error al conectar con la API de Copomex.');
    }

    const data = await response.json();
    const colonias = data.response.colonia; // La API devuelve las colonias en esta propiedad
    res.status(200).json({ colonias });
  } catch (error) {
    console.error('Error al obtener colonias:', error);
    res.status(500).json({ message: 'Error al obtener las colonias.' });
  }
});

module.exports = router;
