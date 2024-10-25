const User = require('../models/User');
const { LoginAudit } = require('../models/Audit');  // Importar el modelo de auditoría
const bcrypt = require('bcrypt');

exports.login = async (req, res) => {
  const { correo, password } = req.body;

  try {
    console.log('Correo recibido:', correo);

    // Verificación inicial del correo
    if (!correo || !correo.trim()) {
      console.log('Correo no proporcionado o vacío');
      return res.status(400).json({ message: 'Correo requerido.' });
    }

    const user = await User.findOne({ correo });

    if (!user) {
      console.log('Usuario no encontrado para el correo:', correo);
      return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked) {
      return res.status(403).json({ message: 'Tu cuenta está bloqueada. Intenta más tarde.' });
    }

    // Verificación de la verificación del correo
    if (!user.isVerified) {
      console.log('Correo no verificado para el usuario:', user.correo);
      return res.status(400).json({ message: 'Debes verificar tu correo electrónico antes de iniciar sesión.' });
    }

    // Validación adicional del campo de contraseña
    if (!password || !password.trim()) {
      console.log('Contraseña no proporcionada o vacía');
      return res.status(400).json({ message: 'Contraseña requerida.' });
    }

    console.log('Longitud de contraseña ingresada:', password.trim().length);
    console.log('Contraseña ingresada:', password.trim());
    console.log('Contraseña almacenada (hasheada):', user.password);

    // Comparación de la contraseña con manejo de errores
    const isMatch = await user.comparePassword(password.trim());

    if (!isMatch) {
      console.log('Contraseña incorrecta, aumentando intentos fallidos.');
      await user.incrementLoginAttempts(); // Aumentar intentos fallidos
      return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
    }

    // Si el inicio de sesión es exitoso, restablecer intentos fallidos
    await user.resetLoginAttempts();

    // Registrar el inicio de sesión en la auditoría
    await LoginAudit.create({
      nombreCompleto: `${user.nombre} ${user.apellidos}`, // Concatenar nombre y apellidos
      correo: user.correo
    });

    // Reducción de los detalles del usuario devueltos
    const userResponse = {
      id: user._id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      correo: user.correo,
      role: user.role
    };

    // Manejo de roles
    if (user.role === 'admin') {
      return res.status(200).json({ message: 'Inicio de sesión exitoso', role: 'admin', user: userResponse });
    } else {
      return res.status(200).json({ message: 'Inicio de sesión exitoso', role: 'user', user: userResponse });
    }

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};
