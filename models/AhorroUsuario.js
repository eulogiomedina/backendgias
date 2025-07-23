const mongoose = require("mongoose");

const ahorroSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  tipo: { 
    type: String, 
    required: true, 
    enum: ["Semanal", "Quincenal", "Mensual"] 
  },
  fechaInicio: { type: Date, default: Date.now },

  credencial: { type: String, required: true }, // URL de la credencial
  fotoPersona: { type: String, required: true }, // Foto con cabello recogido

  facebook: { type: String, required: true },

  orden: { type: Number, default: 1 },
  usuarioHaPagado: { type: Boolean, default: false },
  totalCiclos: { type: Number, default: 10 },
  siguienteReceptor: { type: String, default: "" },

  nombrePerfil: { type: String, required: true } // ✅ Nombre validado y guardado siempre
});

const AhorroUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ahorros: [ahorroSchema]
});

module.exports = mongoose.model("AhorroUsuario", AhorroUsuarioSchema);
