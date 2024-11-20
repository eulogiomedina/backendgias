const mongoose = require('mongoose');

const titleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: 50, // Limitar el título a 100 caracteres
    },
});

module.exports = mongoose.model('Title', titleSchema);
