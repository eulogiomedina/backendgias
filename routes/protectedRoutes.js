// routes/protectedRoutes.js
const express = require('express');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware'); // Asegúrate de usar la ruta correcta
const router = express.Router();

router.get('/admin', verifyToken, checkRole('admin'), (req, res) => {
  res.send('Ruta de administración');
});

router.get('/user', verifyToken, checkRole('user'), (req, res) => {
  res.send('Ruta de usuario');
});

module.exports = router;
