const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();

// --------------------- CONFIGURACIÓN ---------------------

// Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Twilio (WhatsApp)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// --------------------- NORMALIZADOR ---------------------

const normalizaNumeroMX = (numeroDestino) => {
  let numero = numeroDestino;
  if (numero.startsWith('+52') && !numero.startsWith('+521')) {
    numero = '+521' + numero.slice(3);
  }
  return numero;
};

// --------------------- FUNCIÓN GENÉRICA WHATSAPP ---------------------

const enviarWhatsApp = async (numeroDestino, mensaje) => {
  const numeroNormalizado = normalizaNumeroMX(numeroDestino);

  try {
    const message = await twilioClient.messages.create({
      body: mensaje,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${numeroNormalizado}`
    });
    console.log('✅ WhatsApp enviado:', message.sid);
    return message;
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
    throw error;
  }
};

// --------------------- FUNCIÓN: RECORDATORIO PAGO ---------------------

const enviarRecordatorioPago = async (usuario, tanda, fechaProximoPago) => {
  const fechaFormateada = fechaProximoPago.toISOString().substring(0, 10);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.correo,
    subject: 'Recordatorio de Pago - GIAS',
    html: `
      <h2>Hola ${usuario.nombre},</h2>
      <p>Te recordamos que tu próximo pago está programado para el ${fechaFormateada}.</p>
      <p>Detalles de la tanda:</p>
      <ul>
        <li>Monto a pagar: $${tanda.monto}</li>
        <li>Tipo de tanda: ${tanda.tipo}</li>
      </ul>
      <p>Por favor, asegúrate de realizar tu pago a tiempo para evitar penalizaciones.</p>
    `
  };

  try {
    console.log(`📧 Enviando recordatorio a: ${usuario.correo}...`);
    await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado');

    // WhatsApp con formato bonito
    const mensajeWhatsApp = `*Hola ${usuario.nombre}*\n\nTe recordamos que tu próximo pago está programado para _${fechaFormateada}_ por *$${tanda.monto}*.\n\n✅ Evita penalizaciones realizando tu pago a tiempo.\n\n*GIAS*`;

    await enviarWhatsApp(usuario.telefono, mensajeWhatsApp);
    console.log('✅ WhatsApp de recordatorio enviado');
  } catch (error) {
    console.error('❌ Error al enviar recordatorio:', error);
    throw error;
  }
};

// --------------------- FUNCIÓN: NOTIFICACIÓN ESTADO ---------------------

const enviarNotificacionEstadoPago = async (usuario, pago, tanda) => {
  const estadoTexto = {
    'Pendiente': 'está pendiente de revisión',
    'Aprobado': 'ha sido aprobado',
    'Rechazado': 'ha sido rechazado'
  };

  const fechaPagoFormateada = pago.fechaPago.toISOString().substring(0, 10);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.correo,
    subject: `Estado de Pago - ${pago.estado}`,
    html: `
      <h2>Hola ${usuario.nombre},</h2>
      <p>Tu pago por $${pago.monto} ${estadoTexto[pago.estado] || "tiene un estado desconocido"}.</p>
      <p>Detalles del pago:</p>
      <ul>
        <li>Fecha de pago: ${fechaPagoFormateada}</li>
        <li>Tipo de tanda: ${tanda.tipo}</li>
        ${pago.atraso ? '<li style="color: red;">Pago con atraso</li>' : ''}
      </ul>
      ${pago.estado === 'Rechazado' ? '<p>Por favor, contacta al administrador para más información.</p>' : ''}
    `
  };

  try {
    console.log(`📧 Enviando notificación de estado a: ${usuario.correo}...`);
    await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado');

    const mensajeWhatsApp = `*Hola ${usuario.nombre}*\n\nTu pago de *$${pago.monto}* ${estadoTexto[pago.estado]}.\n\n📅 Fecha: _${fechaPagoFormateada}_\n\n${pago.atraso ? '⚠️ Pago con atraso.\n' : ''}*GIAS*`;

    await enviarWhatsApp(usuario.telefono, mensajeWhatsApp);
    console.log('✅ WhatsApp de estado enviado');
  } catch (error) {
    console.error('❌ Error al enviar notificación de estado:', error);
    throw error;
  }
};

// --------------------- FUNCIÓN: NOTIFICACIÓN ATRASO ---------------------

const enviarNotificacionAtraso = async (usuario, pago, tanda) => {
  const fechaPagoFormateada = pago.fechaPago.toISOString().substring(0, 10);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: usuario.correo,
    subject: 'Aviso de Pago Atrasado - GIAS',
    html: `
      <h2>Hola ${usuario.nombre},</h2>
      <p>Tu pago de la tanda tipo ${tanda.tipo} está atrasado.</p>
      <p>Detalles:</p>
      <ul>
        <li>Monto pendiente: $${pago.monto}</li>
        <li>Fecha programada original: ${fechaPagoFormateada}</li>
      </ul>
      <p>Por favor, realiza tu pago lo antes posible para evitar mayores penalizaciones.</p>
    `
  };

  try {
    console.log(`📧 Enviando notificación de atraso a: ${usuario.correo}...`);
    await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado');

    const mensajeWhatsApp = `*Hola ${usuario.nombre}*\n\n⚠️ Tu pago de la tanda *${tanda.tipo}* está atrasado.\n\n💰 Monto pendiente: *$${pago.monto}*\n📅 Fecha original: _${fechaPagoFormateada}_\n\nPor favor, realiza tu pago lo antes posible para evitar mayores penalizaciones.\n\n*GIAS*`;

    await enviarWhatsApp(usuario.telefono, mensajeWhatsApp);
    console.log('✅ WhatsApp de atraso enviado');
  } catch (error) {
    console.error('❌ Error al enviar notificación de atraso:', error);
    throw error;
  }
};

// --------------------- EXPORTAR ---------------------

module.exports = {
  enviarRecordatorioPago,
  enviarNotificacionEstadoPago,
  enviarNotificacionAtraso
};
// Este módulo maneja el envío de correos electrónicos y notificaciones para recordatorios de pagos, estados de pago y atrasos.