const mongoose = require("mongoose");

const NuevoAhorroSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  tipo: { type: String, required: true, enum: ["Semanal", "Quincenal", "Mensual"] },
  fechaCreacion: { type: Date, default: Date.now },
});

// ⚠️ Se especifica el nombre de la colección "nuevos_ahorros"
module.exports = mongoose.model("NuevoAhorro", NuevoAhorroSchema, "nuevos ahorros");
