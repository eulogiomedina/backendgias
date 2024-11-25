const mongoose = require('mongoose');

// Definir el esquema para cuentas bloqueadas
const blockedAccountSchema = new mongoose.Schema({
  correo: { type: String, required: true }, // Correo del usuario bloqueado
  fechaBloqueo: { type: Date, default: Date.now }, // Fecha y hora del bloqueo
});

// Configurar TTL (eliminar automáticamente documentos después de 30 días)
blockedAccountSchema.index({ fechaBloqueo: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Crear el modelo
const BlockedAccount = mongoose.model('BlockedAccount', blockedAccountSchema);

module.exports = BlockedAccount;
