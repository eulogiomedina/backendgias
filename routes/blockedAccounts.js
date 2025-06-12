const express = require('express');
const router = express.Router();
const BlockedAccount = require('../models/BlockedAccount'); // Importar el nuevo modelo

// Ruta para obtener las cuentas bloqueadas
router.get('/blocked', async (req, res) => {
  try {
    // Obtener las cuentas bloqueadas
    const blockedAccounts = await BlockedAccount.find().select('correo fechaBloqueo');
    res.status(200).json(blockedAccounts);
  } catch (error) {
    console.error('Error al obtener las cuentas bloqueadas:', error);
    res.status(500).json({ error: 'Error al obtener las cuentas bloqueadas' });
  }
});

router.get('/', async (req, res) => {
  try {
    const blockedAccounts = await BlockedAccount.find().select('correo fechaBloqueo');
    res.status(200).json(blockedAccounts);
  } catch (error) {
    console.error('Error al obtener las cuentas bloqueadas:', error);
    res.status(500).json({ error: 'Error al obtener las cuentas bloqueadas' });
  }
});

module.exports = router;
