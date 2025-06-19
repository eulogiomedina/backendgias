const express = require('express');
const router = express.Router();
const User = require('../models/User');
const NotificacionWearOS = require('../models/NotificacionWearOS');

// 👉 Función para generar un token de 5 dígitos aleatorio
const generarToken = () => Math.floor(10000 + Math.random() * 90000).toString();

/**
 * Ruta: POST /api/wearos/generar-token/:userId
 * Descripción: Genera un token de 5 dígitos y lo guarda en el usuario.
 */
router.post('/api/wearos/generar-token/:userId', async (req, res) => {
  try {
    const token = generarToken();

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      {
        tokenWearOS: token,
        tokenWearOSActivo: true,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log(`✅ Token generado para usuario ${user.correo}: ${token}`);

    res.json({ token });
  } catch (err) {
    console.error('❌ Error al generar token:', err);
    res.status(500).json({ message: 'Error al generar token' });
  }
});

/**
 * Ruta: POST /api/wearos/validar-token
 * Descripción: Valida el token enviado desde la app Wear OS.
 */
router.post('/api/wearos/validar-token', async (req, res) => {
  const { token } = req.body;

  console.log(`🔍 Token recibido: [${token}]`);

  try {
    const user = await User.findOne({ tokenWearOS: token, tokenWearOSActivo: true });

    if (user) {
      console.log(`✅ Token válido para usuario ${user.correo}`);
      return res.json({ success: true, userId: user._id, message: 'Token válido' });
    } else {
      console.warn(`❌ Token inválido: ${token}`);
      return res.status(400).json({ success: false, message: 'Token inválido' });
    }
  } catch (err) {
    console.error('❌ Error al validar token:', err);
    res.status(500).json({ message: 'Error al validar token' });
  }
});

/**
 * Ruta: GET /api/wearos/notificaciones/:userId
 * Descripción: Devuelve las notificaciones NO leídas del usuario
 */
router.get('/api/wearos/notificaciones/:userId', async (req, res) => {
  try {
    const notificaciones = await NotificacionWearOS.find({
      userId: req.params.userId,
      leido: false
    }).sort({ fecha: -1 });

    res.json(notificaciones);
  } catch (error) {
    console.error('❌ Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

/**
 * Ruta: PUT /api/wearos/notificaciones/:id/leido
 * Descripción: Marca una notificación como leída
 */
router.put('/api/wearos/notificaciones/:id/leido', async (req, res) => {
  try {
    const notificacion = await NotificacionWearOS.findByIdAndUpdate(
      req.params.id,
      { leido: true },
      { new: true }
    );

    res.json(notificacion);
  } catch (error) {
    console.error('❌ Error al marcar como leída:', error);
    res.status(500).json({ error: 'Error al marcar como leída' });
  }
});

module.exports = router;
