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
 */
router.get('/login', (req, res, next) => {
  console.log('[OAuth GET /login] query:', req.query);
  const { response_type, client_id, redirect_uri, state } = req.query;

  if (
    response_type !== 'code' ||
    client_id     !== process.env.ALEXA_CLIENT_ID ||
    !redirect_uri
  ) {
    console.error('[OAuth GET /login] Parámetros inválidos:', { response_type, client_id, redirect_uri });
    return res.status(400).send('Parámetros OAuth inválidos');
  }

  try {
    console.log('[OAuth GET /login] renderizando login.ejs');
    res.render('login', {
      error: null,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  } catch (err) {
    console.error('[OAuth GET /login] Error al renderizar login.ejs:', err.stack);
    next(err);
  }
});

/**
 * 2) POST /oauth/login
 */
router.post('/login', async (req, res) => {
  console.log('[OAuth POST /login] body:', req.body);
  const { correo, password, response_type, client_id, redirect_uri, state } = req.body;

  try {
    const user = await User.findOne({ correo });
    console.log('[OAuth POST /login] Usuario encontrado:', !!user);

    if (!user || !(await user.comparePassword(password))) {
      console.warn('[OAuth POST /login] Credenciales incorrectas para correo:', correo);
      throw new Error('Correo o contraseña incorrectos');
    }

    if (response_type === 'code' && client_id === process.env.ALEXA_CLIENT_ID) {
      const code = crypto.randomBytes(16).toString('hex');
      oauthCodes[code] = {
        userId:  user._id.toString(),
        created: Date.now()
      };
      console.log(`[OAuth POST /login] Código generado ${code} → userId ${user._id}`);

      const url = new URL(redirect_uri);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state);
      console.log('[OAuth POST /login] Redirigiendo a:', url.toString());
      return res.redirect(url.toString());
    }

    console.error('[OAuth POST /login] Tipo de respuesta no soportado:', response_type);
    throw new Error('Unsupported response_type');
  }
  catch (err) {
    console.error('[OAuth POST /login] Error:', err.stack);
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

/**
 * 3) POST /oauth/token
 */
router.post('/token', async (req, res) => {
  console.log('[OAuth POST /token] body:', req.body);
  const { grant_type, code, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    console.error('[OAuth POST /token] grant_type no soportado:', grant_type);
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  if (
    client_id     !== process.env.ALEXA_CLIENT_ID ||
    client_secret !== process.env.ALEXA_CLIENT_SECRET
  ) {
    console.error('[OAuth POST /token] client_id o client_secret inválidos:', { client_id, client_secret: '(<omitted>)' });
    return res.status(401).json({ error: 'invalid_client' });
  }

  const entry = oauthCodes[code];
  console.log('[OAuth POST /token] Buscando code:', code, '→ entry:', entry);

  if (!entry || (Date.now() - entry.created) > 5 * 60 * 1000) {
    console.error('[OAuth POST /token] Código inválido o expirado:', code);
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const accessToken = crypto.randomBytes(32).toString('hex');
  await new Token({
    accessToken,
    userId:    entry.userId,
    expiresAt: new Date(Date.now() + 3600 * 1000) // 1 hora
  }).save();
  console.log('[OAuth POST /token] Token guardado en BD:', accessToken);

  delete oauthCodes[code];
  console.log('[OAuth POST /token] Código de un solo uso eliminado:', code);

  return res.json({
    access_token:  accessToken,
    token_type:    'Bearer',
    expires_in:    3600,
    refresh_token: 'dummy-refresh-token'
  });
});

module.exports = router;
