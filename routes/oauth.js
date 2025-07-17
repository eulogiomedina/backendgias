// routes/oauth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const Token   = require('../models/Token');

// Necesitamos parsear form-urlencoded en todo POST
router.use(express.urlencoded({ extended: true }));

// “Almacenamiento” temporal de códigos de Authorization Code Grant
const authCodes = {};

/**
 * 1) GET /oauth/login
 *    – Renderiza el formulario, cualquiera sea response_type
 */
router.get('/login', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;

  // Asegúrate de que venga client_id + redirect_uri
  if (!client_id || !redirect_uri) {
    return res.status(400).send('Missing client_id or redirect_uri');
  }

  // Manda todo al view como campos ocultos
  res.render('login', {
    error: null,
    oauth: { response_type, client_id, redirect_uri, state }
  });
});

/**
 * 2) POST /oauth/login
 *    – Procesa las credenciales y, según response_type, hace implicit o code grant.
 */
router.post('/login', async (req, res) => {
  const {
    correo, password,
    response_type, client_id, redirect_uri, state
  } = req.body;

  try {
    // 2.a) Validar usuario/contraseña
    const user = await User.findOne({ correo });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Credenciales inválidas');
    }

    // 2.b) Implicit Grant → entrega el access_token en el fragmento
    if (response_type === 'token') {
      const accessToken = crypto.randomBytes(32).toString('hex');
      // Guarda el token para validarlo luego
      await new Token({
        accessToken,
        userId:    user._id.toString(),
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }).save();

      // Construir fragmento
      const fragment = [
        `access_token=${accessToken}`,
        `token_type=Bearer`,
        `expires_in=3600`,
        state ? `state=${state}` : ''
      ].filter(Boolean).join('&');

      return res.redirect(`${redirect_uri}#${fragment}`);
    }

    // 2.c) Authorization Code Grant (si response_type === 'code')
    if (response_type === 'code') {
      const code = crypto.randomBytes(16).toString('hex');
      authCodes[code] = {
        userId:   user._id.toString(),
        clientId: client_id,
        created:  Date.now()
      };
      // Redirige con ?code=&state=
      const url = new URL(redirect_uri);
      url.searchParams.set('code',  code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    }

    // 2.d) Otros response_type no soportados
    throw new Error('Unsupported response_type');
  }
  catch (err) {
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

/**
 * 3) POST /oauth/token
 *    – Solo necesario para Authorization Code Grant
 */
router.post('/token', express.urlencoded({ extended: true }), async (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  if (client_id !== process.env.ALEXA_CLIENT_ID
      || client_secret !== process.env.ALEXA_CLIENT_SECRET) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const entry = authCodes[code];
  if (!entry
      || entry.clientId !== client_id
      || Date.now() - entry.created > 5 * 60 * 1000
  ) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // Generar access_token definitivo
  const accessToken = crypto.randomBytes(32).toString('hex');
  await new Token({
    accessToken,
    userId:    entry.userId,
    expiresAt: new Date(Date.now() + 3600 * 1000)
  }).save();

  // Código de un solo uso
  delete authCodes[code];

  return res.json({
    access_token:  accessToken,
    token_type:    'Bearer',
    expires_in:    3600,
    refresh_token: 'dummy-refresh-token'
  });
});

module.exports = router;
