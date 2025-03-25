const mongoose = require("mongoose");

const pagoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tandaId: { type: mongoose.Schema.Types.ObjectId, ref: "Tanda", required: true },
  monto: { type: Number, required: true },
  comprobanteUrl: { type: String, required: true },
  estado: {
    type: String,
    enum: ["Pendiente", "Aprobado", "Rechazado"],
    default: "Pendiente"
  },
  fechaPago: { type: Date, required: true },
  comision: { type: Number, default: 0 },
  atraso: { type: Boolean, default: false },
  conPenalizacion: { type: Boolean, default: false }, // ✅ ESTA LÍNEA ES LA QUE TE FALTABA
  fechaReprogramada: { type: Date },
  mensajeOCR: { type: String }
});

module.exports = mongoose.model("Pago", pagoSchema);
