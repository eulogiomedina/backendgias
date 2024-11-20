const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

const ZEROBUNCE_API_KEY = process.env.ZEROBUNCE_API_KEY;

// Ruta para validar el correo electrónico
router.post('/validate-email', async (req, res) => {
  const { email } = req.body;

  try {
    const response = await fetch(
      `https://api.zerobounce.net/v2/validate?email=${email}&api_key=${ZEROBUNCE_API_KEY}`
    );
    const result = await response.json();

    if (result.status === 'valid') {
      res.json({ valid: true, message: 'Correo válido' });
    } else {
      res.json({ valid: false, message: 'Correo no válido o no existe' });
    }
  } catch (error) {
    console.error('Error al validar correo:', error);
    res.status(500).json({ valid: false, message: 'Error en la validación' });
  }
});

module.exports = router;
