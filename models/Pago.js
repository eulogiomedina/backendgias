// models/Pago.js
const mongoose = require("mongoose");

const pagoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Referencia al plan/tanda
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  comprobanteUrl: { type: String },  // URL del comprobante subido a Cloudinary
  estado: { type: String, default: "pendiente" } // pendiente, aprobado, rechazado, etc.
});

module.exports = mongoose.model("Pago", pagoSchema);
