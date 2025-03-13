const mongoose = require("mongoose");

// Esquema para las fechas de pago y recepción
const fechasPagoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fechaPago: { type: Date, default: null },
  fechaRecibo: { type: Date, default: null }, // ✅ Se agrega fechaRecibo
});

// Esquema para los participantes
const participanteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orden: { type: Number, required: true },
  usuarioHaPagado: { type: Boolean, default: false },
});

// Esquema para la tanda
const tandaSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  tipo: { type: String, required: true, enum: ["Semanal", "Quincenal", "Mensual"] },
  fechaInicio: { type: Date, default: null },
  diaPago: { type: String, default: "Domingo" }, // ✅ Día de pago calculado en base a fechaInicio
  totalCiclos: { type: Number, default: 10 },
  participantes: { type: [participanteSchema], default: [] },
  iniciada: { type: Boolean, default: false }, // Indica si la tanda ha iniciado
  fechasPago: { type: [fechasPagoSchema], default: [] }, // ✅ Se asegura que fechaRecibo también se almacene
});

// Hook antes de guardar la tanda para ajustar el día de pago dinámicamente
tandaSchema.pre("save", function (next) {
  if (this.fechaInicio) {
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    this.diaPago = diasSemana[new Date(this.fechaInicio).getUTCDay()]; // ✅ Ajusta el día de pago dinámicamente
  }
  next();
});

module.exports = mongoose.model("Tanda", tandaSchema);
