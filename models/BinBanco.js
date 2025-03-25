const mongoose = require("mongoose");

const binBancoSchema = new mongoose.Schema({
  bin: { type: String, required: true, unique: true },
  banco: { type: String, required: true },
});

module.exports = mongoose.model("BinBanco", binBancoSchema);
