const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Ajusta el path si tu modelo es diferente
require('dotenv').config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});

const APP_URL = "https://forntendgias.vercel.app"; // Cambia si vas a producción

// ----------- CREAR PREFERENCIA MERCADO PAGO --------------
router.post('/create_preference', async (req, res) => {
    try {
        const { concepto, cantidad, monto, userId, tandaId } = req.body;
        if (!concepto || !monto || !userId || !tandaId) {
            return res.status(400).json({ error: 'Faltan datos del pago' });
        }

        const preference = {
            items: [{
                title: concepto,
                quantity: 1,
                unit_price: Number(monto),
                currency_id: 'MXN'
            }],
            back_urls: {
              success: `${APP_URL}/pago-exitoso?tanda=${tandaId}&user=${userId}&monto=${monto}&tipo=${concepto}`,
              failure: `${APP_URL}/pagos?status=failure&tanda=${tandaId}&user=${userId}`,
              pending: `${APP_URL}/pagos?status=pending&tanda=${tandaId}&user=${userId}`,
            },
            auto_return: "approved",  // <--- AGREGADO AQUÍ
            metadata: {
                userId,
                tandaId
            }
        };
        console.log("BACK_URLS GENERADAS:", preference.back_urls);

        const preferenceClient = new Preference(client);
        const result = await preferenceClient.create({ body: preference });

        res.json({
            id: result.id,
            init_point: result.init_point
        });

    } catch (error) {
        console.error("❌ Error creando preferencia MercadoPago:", error);
        res.status(500).json({
            error: 'Error al crear preferencia de pago',
            message: error.message
        });
    }
});

// ----------- WEBHOOK PARA ENVÍO DE CORREO AL APROBAR PAGO --------------

// Configura tu transportador SMTP con tus variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Usar tu correo y contraseña de app
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint webhook (recuerda poner la url pública en MercadoPago: ej. https://tudominio/api/mercadopago/webhook)
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (body.type === "payment") {
      const paymentId = body.data.id;

      // Usar el SDK de mercadopago para consultar el pago
      const mp = require('mercadopago');
      mp.configure({ access_token: process.env.MP_ACCESS_TOKEN });
      const payment = await mp.payment.findById(paymentId);

      if (payment.body.status === "approved") {
        const userId = payment.body.metadata.userId;
        const tandaId = payment.body.metadata.tandaId;
        const user = await User.findById(userId);

        // Enviar correo al usuario
        await transporter.sendMail({
          from: `"GIAS Pagos" <${process.env.EMAIL_USER}>`,
          to: user.correo, // Asegúrate de que el campo en el modelo es .correo
          subject: 'Comprobante de pago - GIAS',
          html: `
            <h2>¡Pago realizado correctamente!</h2>
            <p>Hola ${user.nombre},</p>
            <p>Tu pago de la tanda <b>${payment.body.description}</b> por <b>$${payment.body.transaction_amount} MXN</b> se ha recibido con éxito.</p>
            <p>ID de pago: <b>${payment.body.id}</b></p>
            <p>Fecha: ${new Date(payment.body.date_approved).toLocaleString()}</p>
            <p>¡Gracias por confiar en GIAS!</p>
          `,
        });
        console.log("Correo enviado a:", user.correo);
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send('Error');
  }
});

module.exports = router;
