const mongoose = require('mongoose');

const NotificacionWearOSSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo: { type: String, required: true },
  titulo: { type: String, required: true },
  mensaje: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  leida: { type: Boolean, default: false }
});

module.exports = mongoose.model('NotificacionWearOS', NotificacionWearOSSchema);
// Este modelo define la estructura de las notificaciones para Wear OS, incluyendo campos para el usuario, tipo de notificación, título, mensaje, fecha y estado de lectura.
// Se utiliza Mongoose para interactuar con MongoDB, y el esquema incluye validaciones básicas