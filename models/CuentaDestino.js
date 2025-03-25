const mongoose = require("mongoose");

const cuentaDestinoSchema = new mongoose.Schema({
  titular: { type: String, required: true },
  numeroCuenta: { type: String, required: true },
  numeroTarjeta: { type: String },
  banco: { type: String, required: true }
});

module.exports = mongoose.model("CuentaDestino", cuentaDestinoSchema);
