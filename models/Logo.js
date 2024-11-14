// models/logo.js
const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema({
    url: { type: String, required: true }, // Solo la URL
    uploadDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Logo', logoSchema);