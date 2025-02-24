const mongoose = require("mongoose");

const ahorroSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  tipo: { type: String, required: true, enum: ["Semanal", "Quincenal", "Mensual"] },
  fechaInicio: { type: Date, default: Date.now },
  credencial: { type: String, required: true }, // URL de la imagen
  facebook: { type: String, required: true },
});

const AhorroUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ahorros: [ahorroSchema] // Array de ahorros
});

module.exports = mongoose.model("AhorroUsuario", AhorroUsuarioSchema);
