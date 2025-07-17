// routes/oauth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const Token   = require('../models/Token');

// Parseo de form-urlencoded para TODOS los POST
router.use(express.urlencoded({ extended: true }));

const authCodes = {};

// 1) GET /oauth/login
router.get('/login', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;
  if (response_type !== 'code') {
    return res.status(400).send('Unsupported response_type');
  }
  res.render('login', {
    error: null,
    oauth: { response_type, client_id, redirect_uri, state }
  });
});

// 2) POST /oauth/login
router.post('/login', async (req, res) => {
  const { correo, password, response_type, client_id, redirect_uri, state } = req.body;
  try {
    const user = await User.findOne({ correo });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Credenciales inválidas');
    }

    // Si no es flujo OAuth, tu login normal
    if (!client_id || !redirect_uri || response_type !== 'code') {
      req.session.userId = user._id;
      return res.redirect('/dashboard');
    }

    // Flujo OAuth: genera código y redirige a Alexa
    const code = crypto.randomBytes(16).toString('hex');
    authCodes[code] = { userId: user._id.toString(), clientId: client_id, created: Date.now() };
    const url = new URL(redirect_uri);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);
    return res.redirect(url.toString());

  } catch (err) {
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

// 3) POST /oauth/token
router.post('/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }
  if (client_id !== process.env.ALEXA_CLIENT_ID
      || client_secret !== process.env.ALEXA_CLIENT_SECRET) {
    return res.status(401).json({ error: 'invalid_client' });
  }

  const entry = authCodes[code];
  if (!entry || entry.clientId !== client_id
      || Date.now() - entry.created > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const accessToken = crypto.randomBytes(32).toString('hex');
  await new Token({ accessToken, userId: entry.userId, expiresAt: new Date(Date.now() + 3600*1000) }).save();
  delete authCodes[code];

  return res.json({
    access_token:  accessToken,
    token_type:    'Bearer',
    expires_in:    3600,
    refresh_token: 'dummy-refresh-token'
  });
});

module.exports = router;
