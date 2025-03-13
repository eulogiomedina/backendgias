const mongoose = require("mongoose");

const ahorroSchema = new mongoose.Schema({
  monto: { type: Number, required: true },
  tipo: { 
    type: String, 
    required: true, 
    enum: ["Semanal", "Quincenal", "Mensual"] 
  },
  fechaInicio: { type: Date, default: Date.now },
  credencial: { type: String, required: true }, // URL de la imagen
  facebook: { type: String, required: true },

  // CAMPOS NUEVOS para manejar el ciclo de la tanda:
  orden: { type: Number, default: 1 },            // Posición del usuario en la tanda (1 = el primero, 2 = el segundo, etc.)
  usuarioHaPagado: { type: Boolean, default: false }, // Indica si ya pagó en este ciclo
  totalCiclos: { type: Number, default: 10 },      // Número total de ciclos para la tanda
  siguienteReceptor: { type: String, default: "" } // (Opcional) Para indicar quién es el siguiente
});

const AhorroUsuarioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ahorros: [ahorroSchema] // Array de ahorros
});

module.exports = mongoose.model("AhorroUsuario", AhorroUsuarioSchema);
