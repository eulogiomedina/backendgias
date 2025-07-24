const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Ajusta el path si tu modelo es diferente
const Pago = require('../models/Pago'); // Ajusta la ruta según tu estructura

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
      auto_return: "approved",
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

// ----------- WEBHOOK PARA REGISTRAR PAGO Y ENVIAR CORREO --------------

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/webhook', async (req, res) => {
  try {
    console.log("======> WEBHOOK RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));

    const body = req.body;
    if (body.type === "payment") {
      const paymentId = body.data.id;
      console.log("===> Consultando pago MercadoPago ID:", paymentId);

      // Usar el SDK de mercadopago para consultar el pago
      const mp = require('mercadopago');
      mp.configure({ access_token: process.env.MP_ACCESS_TOKEN });
      const payment = await mp.payment.findById(paymentId);

      // Log completo del pago
      console.log("===> payment.body:", JSON.stringify(payment.body, null, 2));

      if (payment.body.status === "approved") {
        const userId = payment.body.metadata.userId;
        const tandaId = payment.body.metadata.tandaId;
        const user = await User.findById(userId);

        // --- GUARDAR EL PAGO EN LA BASE DE DATOS ---
        const pagoObj = {
          userId,
          tandaId,
          monto: payment.body.transaction_amount,
          fechaPago: payment.body.date_approved,
          estado: "Aprobado",
          metodo: "MercadoPago",
          comprobanteUrl: payment.body.receipt_url || "",
          referenciaPago: payment.body.id,
          // Puedes agregar comision, atraso, etc. aquí si lo deseas
        };

        console.log("===> Intentando guardar Pago en MongoDB:", pagoObj);

        try {
          await Pago.create(pagoObj);
          console.log("===> Pago guardado correctamente en la colección Pago");
        } catch (err) {
          console.error("❌ ERROR al guardar en Pago:", err);
        }

        // --- ENVIAR CORREO AL USUARIO ---
        try {
          await transporter.sendMail({
            from: `"GIAS Pagos" <${process.env.EMAIL_USER}>`,
            to: user.correo,
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
          console.log("===> Correo enviado a:", user.correo);
        } catch (err) {
          console.error("❌ ERROR al enviar correo:", err);
        }
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error("Webhook error:", err);
    console.error("Stack:", err.stack);
    res.status(500).send('Error');
  }
});

module.exports = router;
