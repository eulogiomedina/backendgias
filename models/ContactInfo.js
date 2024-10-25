// models/ContactInfo.js
const mongoose = require('mongoose');

const ContactInfoSchema = new mongoose.Schema({
  direccion: { type: String, required: true },
  correo: { type: String, required: true },
  telefono: { type: String, required: true },
});

module.exports = mongoose.model('ContactInfo', ContactInfoSchema);
