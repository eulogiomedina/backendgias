// routes/openpayRoutes.js
const express = require('express');
const Openpay = require('openpay');
const router = express.Router();

const openpay = new Openpay(
  process.env.OPENPAY_MERCHANT_ID,
  process.env.OPENPAY_PRIVATE_KEY,
  process.env.OPENPAY_SANDBOX === 'true'
);

// ...tu endpoint de pago...

router.post('/pay', async (req, res) => {
  const { token_id, device_session_id, amount, description, customer } = req.body;
  const chargeRequest = {
    source_id: token_id,
    method: 'card',
    amount,
    currency: 'MXN',
    description: description || 'Pago de tanda',
    device_session_id,
    customer, // { name, last_name, email }
  };

  openpay.charges.create(chargeRequest, function(error, charge) {
    if (error) {
      console.error(error);
      return res.status(400).json({ success: false, message: error.description || 'Error en el pago' });
    }
    res.json({ success: true, charge });
  });
});

/* ---- ENDPOINT PARA WEBHOOK DE OPENPAY ---- */
router.post('/webhook', (req, res) => {
  console.log("Webhook recibido de Openpay:", req.body);

  // Si existe el código, muéstralo más bonito:
  if (req.body.verification_code) {
    console.log('🟢 Código de verificación recibido:', req.body.verification_code);
  }

  res.status(200).json({ received: true });
});

module.exports = router;
