// routes/oauth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const Token   = require('../models/Token');

// **Almacén en memoria de códigos OAuth (code → userId)**
const oauthCodes = {};

// Parsear bodies form-urlencoded en todos los POST
router.use(express.urlencoded({ extended: true }));

/**
 * 1) GET /oauth/login
 *    Muestra siempre el formulario de login, recibiendo:
 *      - response_type=code
 *      - client_id
 *      - redirect_uri
 *      - state (opcional)
 */
router.get('/login', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;

  // Validaciones mínimas
  if (
    response_type !== 'code' ||
    client_id !== process.env.ALEXA_CLIENT_ID ||
    !redirect_uri
  ) {
    return res.status(400).send('Parámetros OAuth inválidos');
  }

  // Renderizar la vista EJS `views/login.ejs`
  res.render('login', {
    error: null,
    oauth: { response_type, client_id, redirect_uri, state }
  });
});

/**
 * 2) POST /oauth/login
 *    Procesa las credenciales, genera un código y redirige
 *    de vuelta a Alexa con ?code=…&state=…
 */
router.post('/login', async (req, res) => {
  const { correo, password, response_type, client_id, redirect_uri, state } = req.body;

  try {
    // 2.a) Validar usuario y contraseña
    const user = await User.findOne({ correo });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Correo o contraseña incorrectos');
    }

    // 2.b) Sólo para Auth Code Grant
    if (response_type === 'code' && client_id === process.env.ALEXA_CLIENT_ID) {
      // Generar código de autorización
      const code = crypto.randomBytes(16).toString('hex');
      // Guardarlo en memoria (o BD/Redis si lo prefieres)
      oauthCodes[code] = {
        userId:  user._id.toString(),
        created: Date.now()
      };

      // Redirigir de vuelta a Alexa
      const url = new URL(redirect_uri);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    }

    // Si llegamos aquí, algo no cuadra
    throw new Error('Unsupported response_type');
  }
  catch (err) {
    // En caso de error, volvemos a mostrar el login con mensaje
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

/**
 * 3) POST /oauth/token
 *    Alexa intercambia el code por un access_token
 */
router.post('/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  // 3.a) Validar grant_type
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  // 3.b) Validar credenciales del cliente
  if (
    client_id     !== process.env.ALEXA_CLIENT_ID ||
    client_secret !== process.env.ALEXA_CLIENT_SECRET
  ) {
    return res.status(401).json({ error: 'invalid_client' });
  }
  // 3.c) Verificar el código
  const entry = oauthCodes[code];
  if (!entry || Date.now() - entry.created > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // 3.d) Generar access_token y guardarlo en BD
  const accessToken = crypto.randomBytes(32).toString('hex');
  await new Token({
    accessToken,
    userId:    entry.userId,
    expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hora
  }).save();

  // Código de un solo uso, limpiar
  delete oauthCodes[code];

  // 3.e) Devolver el token a Alexa
  return res.json({
    access_token:  accessToken,
    token_type:    'Bearer',
    expires_in:    3600,
    refresh_token: 'dummy-refresh-token'
  });
});

module.exports = router;
