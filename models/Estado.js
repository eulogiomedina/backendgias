// models/Estado.js
const mongoose = require('mongoose');

const estadoSchema = new mongoose.Schema({
  estado: { type: String, required: true },
});

module.exports = mongoose.model('Estado', estadoSchema);