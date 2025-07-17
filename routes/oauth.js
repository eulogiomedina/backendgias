// routes/oauth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const User    = require('../models/User');
const Token   = require('../models/Token');

// parsea form-urlencoded para todos los POST
router.use(express.urlencoded({ extended: true }));

// GET /oauth/login — muestra siempre tu formulario (tanto para code como para token)
router.get('/login', (req, res) => {
  const { response_type, client_id, redirect_uri, state } = req.query;

  // debes recibir response_type=token (implicit) o response_type=code (auth code)
  if (!client_id || !redirect_uri
      || (response_type !== 'token' && response_type !== 'code')) {
    return res.status(400).send('Missing or unsupported OAuth parameters');
  }

  // Renderiza tu login.ejs pasándole los cuatro campos como ocultos
  res.render('login', {
    error: null,
    oauth: { response_type, client_id, redirect_uri, state }
  });
});

// POST /oauth/login — procesa el login y redirige para token o code
router.post('/login', async (req, res) => {
  const {
    correo, password,
    response_type, client_id, redirect_uri, state
  } = req.body;

  try {
    // 1) Validar credenciales
    const user = await User.findOne({ correo });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Credenciales inválidas');
    }

    // 2) Implicit Grant → response_type === 'token'
    if (response_type === 'token') {
      const accessToken = crypto.randomBytes(32).toString('hex');
      await new Token({
        accessToken,
        userId:    user._id.toString(),
        expiresAt: new Date(Date.now() + 3600*1000)
      }).save();

      const fragment = [
        `access_token=${accessToken}`,
        `token_type=Bearer`,
        `expires_in=3600`,
        state ? `state=${state}` : ''
      ].filter(Boolean).join('&');

      // devuelve un redirect con fragment (#)
      return res.redirect(`${redirect_uri}#${fragment}`);
    }

    // 3) Authorization Code Grant → response_type === 'code'
    if (response_type === 'code') {
      const code = crypto.randomBytes(16).toString('hex');
      // guarda ese code en memoria o BD...
      // ...
      const url = new URL(redirect_uri);
      url.searchParams.set('code', code);
      if (state) url.searchParams.set('state', state);
      return res.redirect(url.toString());
    }

    // 4) Nunca debería llegar aquí
    throw new Error('Unsupported response_type');
  }
  catch (err) {
    // si falla, vuelve a mostrar el login con el mensaje de error
    return res.render('login', {
      error: err.message,
      oauth: { response_type, client_id, redirect_uri, state }
    });
  }
});

// (Tu POST /oauth/token queda igual, solo para Authorization Code Grant)

module.exports = router;
