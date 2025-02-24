const mongoose = require('mongoose');

// Definición del esquema actualizado
const accountSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  telefono: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

// Evitar sobrescribir el modelo si ya está definido
module.exports = mongoose.models.User || mongoose.model('User', accountSchema);
