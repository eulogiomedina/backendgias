// middlewares/accessTokenMiddleware.js
const Token = require('../models/Token');

exports.verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization; // Bearer xyz
    if (!authHeader) {
      return res.status(401).json({ message: 'Falta access_token' });
    }

    const token = authHeader.split(' ')[1];
    const tokenDoc = await Token.findOne({ accessToken: token });

    if (!tokenDoc) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    // Opcional: verifica expiración
    if (tokenDoc.expiresAt && tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Token expirado' });
    }

    // Inyecta el userId resuelto
    req.userId = tokenDoc.userId;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error verificando access_token' });
  }
};
