const mongoose = require('mongoose');

const legalBoundarySchema = new mongoose.Schema({
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
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false, // Para soporte de eliminación lógica
  },
}, { timestamps: true }); // timestamps para createdAt y updatedAt

const LegalBoundary = mongoose.model('LegalBoundary', legalBoundarySchema);

module.exports = LegalBoundary;
