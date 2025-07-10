const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true,
    unique: true // 🔑 Clave única para búsquedas rápidas
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date
});

// Opcional: índice TTL para expiración automática si quieres
// TokenSchema.index({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Token', TokenSchema);
