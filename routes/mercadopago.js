const express = require('express');
const router = express.Router();
const crypto = require("crypto");
const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');

const User = require('../models/User');
const Pago = require('../models/Pago');
const Tanda = require('../models/Tanda');

require('dotenv').config();

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const APP_URL = "https://forntendgias.vercel.app";


// ----------------------------------------------
// 1. CREAR PREFERENCIA (SIN CAMBIOS GRANDES)
// ----------------------------------------------
router.post('/create_preference', async (req, res) => {
  try {
    const { concepto, monto, userId, tandaId } = req.body;

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

    const preferenceClient = new Preference(client);
    const result = await preferenceClient.create({ body: preference });

    res.json({
      id: result.id,
      init_point: result.init_point
    });

  } catch (error) {
    console.error("❌ Error creando preferencia:", error);
    res.status(500).json({ error: 'Error al crear preferencia' });
  }
});


// ----------------------------------------------
// 2. WEBHOOK — VALIDACIÓN Y REGISTRO DE PAGO
// ----------------------------------------------
router.post('/webhook', async (req, res) => {
  try {
    // 🔹 1. Responder de inmediato para que MercadoPago no marque error
    res.status(200).send("OK");

    console.log("📩 WEBHOOK RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));

    // 🔹 2. Validar tipo de evento
    if (req.body.type !== "payment") {
      console.log("➡ No es un evento de pago. Se ignora.");
      return;
    }

    const paymentId = req.body.data.id;

    // 🔹 3. Consultar información del pago
    const mp = require('mercadopago');
    mp.configure({ access_token: process.env.MP_ACCESS_TOKEN });

    const payment = await mp.payment.findById(paymentId);

    console.log("💲 Respuesta de MercadoPago:");
    console.log(JSON.stringify(payment.body, null, 2));

    if (payment.body.status !== "approved") {
      console.log("🚫 Pago no aprobado, ignorado.");
      return;
    }

    // 🔹 4. Datos desde metadata
    const userId = payment.body.metadata.userId;
    const tandaId = payment.body.metadata.tandaId;

    if (!userId || !tandaId) {
      console.log("⚠ NO HAY METADATA — no se puede registrar el pago.");
      return;
    }

    // -----------------------------------------
    // 5. Buscar tanda y fecha del ciclo correcto
    // -----------------------------------------
    const tanda = await Tanda.findById(tandaId);
    if (!tanda) {
      console.log("❌ Tanda no encontrada.");
      return;
    }

    const historialPagos = await Pago.find({ userId, tandaId });

    const fechaPendiente = tanda.fechasPago.find(f =>
      f.userId.toString() === userId &&
      !historialPagos.some(h => h.fechaPago.getTime() === new Date(f.fechaPago).getTime())
    );

    if (!fechaPendiente) {
      console.log("⚠ No hay fecha pendiente. Pago duplicado.");
      return;
    }

    // Penalización por atraso
    const hoy = new Date();
    const atrasado = new Date(fechaPendiente.fechaPago) < hoy;
    const comision = atrasado ? 80 : 0;

    // -----------------------------------------
    // 6. Guardar el pago correctamente
    // -----------------------------------------
    const nuevoPago = new Pago({
      userId,
      tandaId,
      monto: payment.body.transaction_amount + comision,
      fechaPago: fechaPendiente.fechaPago, // ← ciclo correcto
      estado: "Aprobado",
      metodo: "MercadoPago",
      atraso: atrasado,
      comision,
      comprobanteUrl: "",
      referenciaPago: payment.body.id,
      mensajeOCR: "Pago procesado automáticamente desde MercadoPago."
    });

    await nuevoPago.save();

    console.log("✅ Pago registrado correctamente en MongoDB:", nuevoPago._id);


    // -----------------------------------------
    // 7. Enviar correo de confirmación (opcional)
    // -----------------------------------------
    const user = await User.findById(userId);
    if (user) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"GIAS Pagos" <${process.env.EMAIL_USER}>`,
        to: user.correo,
        subject: 'Comprobante de pago - GIAS',
        html: `
          <h2>¡Pago aprobado!</h2>
          <p>Hola ${user.nombre},</p>
          <p>Tu pago por la tanda <b>${payment.body.description}</b> ha sido recibido exitosamente.</p>
          <p>Monto: <b>$${payment.body.transaction_amount} MXN</b></p>
          <p>Fecha asignada al ciclo: ${new Date(fechaPendiente.fechaPago).toLocaleDateString()}</p>
          <p>ID MercadoPago: ${payment.body.id}</p>
        `,
      });

      console.log("📧 Correo enviado correctamente.");
    }

  } catch (err) {
    console.error("❌ ERROR en webhook:", err);
  }
});


// ----------------------------------------------
module.exports = router;
