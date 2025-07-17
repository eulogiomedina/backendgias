// routes/oauth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const Token   = require('../models/Token');

// parsea form-urlencoded en todo POST
router.use(express.urlencoded({ extended: true }));

// 👉 1) GET /oauth/login — muestra siempre el form para Auth Code Grant
router.get('/login', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;

  // Validaciones básicas
  if (
    response_type !== 'code' ||
    client_id !== process.env.ALEXA_CLIENT_ID ||
    !redirect_uri
  ) {
    return res.status(400).send('Parámetros OAuth inválidos');
  }

  // Renderiza el formulario, pasando los campos ocultos
  res.render('login', {
    error: null,
    oauth: { response_type, client_id, redirect_uri, state }
  });
});

// 👉 2) POST /oauth/login — procesa credenciales y emite un código
router.post('/login', async (req, res) => {
  const { correo, password, response_type, client_id, redirect_uri, state } = req.body;
  try {
    // 2.a) Validar usuario
    const user = await User.findOne({ correo });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Correo o contraseña incorrectos');
    }

    // 2.b) Sólo para Auth Code Grant
    if (response_type === 'code' && client_id === process.env.ALEXA_CLIENT_ID) {
      // Generamos un código de autorización
      const code = crypto.randomBytes(16).toString('hex');
      // Lo almacenamos temporalmente (o en BD/Redis si quieres persistencia real)
      oauthCodes[code] = {
        userId:  user._id.toString(),
        created: Date.now()
      };

      // Redirigimos de vuelta a Alexa con ?code=…&state=…
      const url = new URL(redirect_uri);
      url.searchParams.set('code',  code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    }

    throw new Error('Unsupported response_type');
  } catch (err) {
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

// 👉 3) POST /oauth/token — Alexa intercambia el code por un access_token
router.post('/token', express.urlencoded({ extended: true }), async (req, res) => {
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
  if (!entry || Date.now() - entry.created > 5*60*1000) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // 3.d) Generar access_token y opcional refresh_token
  const accessToken = crypto.randomBytes(32).toString('hex');
  await new Token({
    accessToken,
    userId:    entry.userId,
    expiresAt: new Date(Date.now() + 3600*1000)
  }).save();

  // Limpio el código de un solo uso
  delete oauthCodes[code];

  return res.json({
    access_token:  accessToken,
    token_type:    'Bearer',
    expires_in:    3600,
    refresh_token: 'dummy-refresh-token'
  });
});

module.exports = router;
