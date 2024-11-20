const mongoose = require('mongoose');

const termSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  isCurrent: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false, // Campo para la eliminación lógica
  },
}, { timestamps: true }); // timestamps para createdAt y updatedAt

const Term = mongoose.model('Term', termSchema);

module.exports = Term;
