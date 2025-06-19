const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const NotificacionWearOS = require('../models/NotificacionWearOS');

dotenv.config();

// Configurar el transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para enviar correo de recordatorio de pago
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
    console.log(`📧 Enviando recordatorio a: ${usuario.correo} para tanda tipo ${tanda.tipo}`);
    const info = await transporter.sendMail(mailOptions);

    await NotificacionWearOS.create({
      userId: usuario._id,
      tipo: 'RecordatorioPago',
      titulo: 'Recordatorio de Pago',
      mensaje: `Tu próximo pago está programado para el ${fechaFormateada}. Monto: $${tanda.monto}. Tipo: ${tanda.tipo}.`
    });

    return info;
  } catch (error) {
    console.error('❌ Error al enviar correo de recordatorio:', error);
    throw error;
  }
};

// Función para enviar notificación de estado de pago
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
      <p>Tu pago por $${pago.monto} ${estadoTexto[pago.estado]}.</p>
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
    console.log(`📧 Enviando notificación de estado a: ${usuario.correo} para tanda tipo ${tanda.tipo}`);
    const info = await transporter.sendMail(mailOptions);

    await NotificacionWearOS.create({
      userId: usuario._id,
      tipo: 'EstadoPago',
      titulo: `Estado de tu pago: ${pago.estado}`,
      mensaje: `Tu pago por $${pago.monto} ${estadoTexto[pago.estado]}. Tipo: ${tanda.tipo}. ${pago.atraso ? '⚠️ Pago con atraso.' : ''}`
    });

    return info;
  } catch (error) {
    console.error('❌ Error al enviar notificación de estado:', error);
    throw error;
  }
};

// Función para enviar notificación de atraso
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
    console.log(`📧 Enviando notificación de atraso a: ${usuario.correo} para tanda tipo ${tanda.tipo}`);
    const info = await transporter.sendMail(mailOptions);

    await NotificacionWearOS.create({
      userId: usuario._id,
      tipo: 'AtrasoPago',
      titulo: 'Aviso de Pago Atrasado',
      mensaje: `Tu pago de $${pago.monto} de la tanda tipo ${tanda.tipo} está atrasado. Fecha original: ${fechaPagoFormateada}.`
    });

    return info;
  } catch (error) {
    console.error('❌ Error al enviar notificación de atraso:', error);
    throw error;
  }
};

module.exports = {
  enviarRecordatorioPago,
  enviarNotificacionEstadoPago,
  enviarNotificacionAtraso
};
// Este módulo maneja el envío de correos electrónicos y notificaciones para recordatorios de pagos, estados de pago y atrasos.