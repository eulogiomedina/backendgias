/**
 * routes/oauth.js
 * Flujo OAuth 2.0 para Alexa Account Linking
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Token = require('../models/Token');  
const crypto = require('crypto');


const authCodes = {};

//-------------------------------------
// 👉 1) GET /oauth/auth
//-------------------------------------
router.get('/auth', (req, res) => {
  const { state, redirect_uri } = req.query;

  return res.render('login', { state, redirect_uri, error: null });
});

//-------------------------------------
// 👉 2) POST /oauth/auth
//-------------------------------------
router.post('/auth', async (req, res) => {
  const { correo, password, state, redirect_uri } = req.body;

  try {
    const user = await User.findOne({ correo });

    if (!user) {
      return res.render('login', { state, redirect_uri, error: 'Credenciales incorrectas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { state, redirect_uri, error: 'Credenciales incorrectas' });
    }

    const code = crypto.randomBytes(16).toString('hex');
    authCodes[code] = {
      userId: user._id.toString(),
      createdAt: Date.now()
    };

    const redirectURL = `${redirect_uri}?code=${code}&state=${state}`;
    return res.redirect(redirectURL);

  } catch (error) {
    console.error('Error en /auth:', error);
    return res.status(500).send('Error interno del servidor');
  }
});


router.post('/token', async (req, res) => {   
  const { grant_type, code, client_id, client_secret } = req.body;

  console.log('TOKEN REQUEST:', req.body);

  if (client_id !== process.env.ALEXA_CLIENT_ID || client_secret !== process.env.ALEXA_CLIENT_SECRET) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  const authCode = authCodes[code];
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const expired = Date.now() - authCode.createdAt > 5 * 60 * 1000;
  if (expired) {
    delete authCodes[code];
    return res.status(400).json({ error: 'invalid_grant' });
  }

  const accessToken = crypto.randomBytes(32).toString('hex');


  const token = new Token({
    accessToken,
    userId: authCode.userId,
    expiresAt: new Date(Date.now() + 3600 * 1000)
  });
  await token.save();

  console.log(`Generado access_token para userId ${authCode.userId}: ${accessToken}`);

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'dummy-refresh-token'
  });

  delete authCodes[code];
});

module.exports = router;
