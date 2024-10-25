const mongoose = require('mongoose');

const sloganSchema = new mongoose.Schema({
    slogan: {
        type: String,
        required: true,
        maxlength: 100, // Limitar el eslogan a 100 caracteres
    },
});

module.exports = mongoose.model('Slogan', sloganSchema);
