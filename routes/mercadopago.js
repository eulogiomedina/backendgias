const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Pago = require('../models/Pago');
const Tanda = require('../models/Tanda');

require('dotenv').config();

// MERCADOPAGO SDK
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const APP_URL = "https://forntendgias.vercel.app";

/* ============================================================
   🟦 1. CREAR PREFERENCIA
============================================================ */
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

      notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`, // 🔥 NECESARIO
      auto_return: "approved",

      metadata: { userId, tandaId }
    };

    console.log("BACK_URLS GENERADAS:", preference.back_urls);

    const preferenceClient = new Preference(client);
    const result = await preferenceClient.create({ body: preference });

    res.json({
      id: result.id,
      init_point: result.init_point,
    });

  } catch (error) {
    console.error("❌ Error creando preferencia MercadoPago:", error);
    res.status(500).json({ error: 'Error al crear preferencia MP', message: error.message });
  }
});


/* ============================================================
   🟦 2. WEBHOOK — REGISTRAR PAGO AUTOMÁTICAMENTE
============================================================ */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

router.post('/webhook', async (req, res) => {
  try {
    console.log("======> WEBHOOK RECIBIDO:");
    console.log(JSON.stringify(req.body, null, 2));

    const evento = req.body;

    // SOLO PROCESAMOS PAGOS
    if (evento.type !== "payment") return res.status(200).send("No es pago");

    const paymentId = evento.data.id;

    // CONSULTAR EL PAGO COMPLETO EN MERCADOPAGO
    const mp = require('mercadopago');
    mp.configure({ access_token: process.env.MP_ACCESS_TOKEN });

    let mpPayment;

    try {
      const resp = await mp.payment.findById(paymentId);
      mpPayment = resp.body;
      console.log("===> Pago encontrado:", mpPayment);
    } catch (err) {
      console.error("❌ ERROR al consultar pago:", err);
      return res.status(400).send("No se pudo consultar el pago");
    }

    // SOLO PROCESAMOS PAGOS APROBADOS
    if (mpPayment.status !== "approved") {
      console.log("Pago no aprobado, ignorado");
      return res.status(200).send("Pago no aprobado");
    }

    const userId = mpPayment.metadata.userId;
    const tandaId = mpPayment.metadata.tandaId;

    if (!userId || !tandaId) {
      console.error("❌ METADATA VACÍA — No se pueden asignar userId o tandaId");
      return res.status(400).send("Faltan metadatos");
    }

    /* ============================================================
       🟧  AQUI ESTABA EL PROBLEMA:
       NECESITAMOS BUSCAR LA SIGUIENTE FECHA DE PAGO DEL CICLO
    ============================================================= */

    const tanda = await Tanda.findById(tandaId);
    if (!tanda) return res.status(404).send("Tanda no encontrada");

    const historial = await Pago.find({ userId, tandaId });

    // FECHAS QUE FALTAN POR PAGAR
    const fechasPendientes = tanda.fechasPago
      .filter(f =>
        f.userId.toString() === userId &&
        f.fechaPago &&
        !historial.some(h => h.fechaPago && h.fechaPago.toISOString() === f.fechaPago)
      )
      .sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

    const fechaCiclo = fechasPendientes[0]?.fechaPago;

    if (!fechaCiclo) {
      console.log("Usuario ya no tiene fechas pendientes");
      return res.status(200).send("No hay fechas pendientes");
    }

    // VERIFICAR SI YA EXISTE EL PAGO (Evita duplicados)
    const yaExiste = await Pago.findOne({
      userId,
      tandaId,
      fechaPago: fechaCiclo,
      metodo: "MercadoPago"
    });

    if (yaExiste) {
      console.log("⚠ Pago ya registrado anteriormente");
      return res.status(200).send("Pago duplicado ignorado");
    }

    /* ============================================================
       🟩 CREAR EL REGISTRO REAL DEL PAGO 
    ============================================================= */

    const nuevoPago = await Pago.create({
      userId,
      tandaId,
      monto: mpPayment.transaction_amount,
      fechaPago: fechaCiclo, // 🔥 FECHA CORRECTA DEL CICLO
      estado: "Aprobado",
      metodo: "MercadoPago",
      comprobanteUrl: "",
      referenciaPago: mpPayment.id,
      mensajeOCR: "Pago registrado automáticamente desde MercadoPago.",
      atraso: false,
      conPenalizacion: false
    });

    console.log("===> Pago guardado correctamente:", nuevoPago._id);

    /* ============================================================
       🟦 ENVIAR CORREO
    ============================================================= */

    const user = await User.findById(userId);

    try {
      await transporter.sendMail({
        from: `"GIAS Pagos" <${process.env.EMAIL_USER}>`,
        to: user.correo,
        subject: "Pago recibido - GIAS",
        html: `
          <h2>¡Pago recibido!</h2>
          <p>Hola ${user.nombre}, tu pago de <b>$${mpPayment.transaction_amount}</b> fue aprobado correctamente.</p>
          <p>Fecha programada: ${new Date(fechaCiclo).toLocaleDateString("es-MX")}</p>
          <p>ID Mercado Pago: ${mpPayment.id}</p>
        `,
      });
      console.log("Correo enviado:", user.correo);
    } catch (err) {
      console.error("❌ Error enviando correo:", err);
    }

    return res.status(200).send("OK");

  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return res.status(500).send("Webhook error");
  }
});

module.exports = router;
