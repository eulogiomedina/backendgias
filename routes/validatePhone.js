const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

// Ruta para validar números de teléfono
router.post('/validate-phone', async (req, res) => {
  const { phone } = req.body;

  try {
    const response = await fetch(
      `http://apilayer.net/api/validate?access_key=${process.env.NUMVERIFY_API_KEY}&number=${phone}`
    );
    const result = await response.json();

    if (result.valid) {
      res.json({ valid: true, message: 'Número válido' });
    } else {
      res.json({ valid: false, message: 'Número no válido' });
    }
  } catch (error) {
    console.error('Error al validar número:', error);
    res.status(500).json({ valid: false, message: 'Error en la validación' });
  }
});

module.exports = router;
