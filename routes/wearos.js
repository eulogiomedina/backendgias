const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 👉 Función para generar un token de 5 dígitos aleatorio
const generarToken = () => Math.floor(10000 + Math.random() * 90000).toString();

/**
 * Ruta: POST /api/wearos/generar-token/:userId
 * Descripción: Genera un token de 5 dígitos y lo guarda en el usuario.
 * Uso: Botón "Generar Token" en el perfil web.
 */
router.post('/generar-token/:userId', async (req, res) => {
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
 * Body: { token: "12345" }
 * Uso: En la app de Wear OS cuando el usuario introduce el token.
 */
router.post('/validar-token', async (req, res) => {
  const { token } = req.body;

  console.log(`🔍 Token recibido: [${token}]`);
 

  try {
    const user = await User.findOne({ tokenWearOS: token, tokenWearOSActivo: true });

    if (user) {
      console.log(`✅ Token válido para usuario ${user.correo}`);

      // Si quieres, puedes aquí también desactivar el token después de validarlo (opcional):
      // user.tokenWearOSActivo = false;
      // await user.save();

      return res.json({ success: true, message: 'Token válido' });
    } else {
      console.warn(`❌ Token inválido: ${token}`);
      return res.status(400).json({ success: false, message: 'Token inválido' });
    }
  } catch (err) {
    console.error('❌ Error al validar token:', err);
    res.status(500).json({ message: 'Error al validar token' });
  }
});

module.exports = router;
