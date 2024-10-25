// routes/audit.js (Ejemplo de archivo para manejar las auditorías)

const express = require('express');
const { LoginAudit, PasswordChangeAudit } = require('../models/Audit');
const router = express.Router();

// Ruta para obtener registros de inicios de sesión
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await LoginAudit.find().sort({ fechaHora: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error al obtener registros de auditoría:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Ruta para obtener registros de cambios de contraseña
router.get('/password-change-logs', async (req, res) => {
  try {
    const logs = await PasswordChangeAudit.find().sort({ fechaHora: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Error al obtener registros de cambios de contraseña:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

module.exports = router;
