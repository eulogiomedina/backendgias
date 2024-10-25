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
}, { timestamps: true });

const LegalBoundary = mongoose.model('LegalBoundary', legalBoundarySchema);

module.exports = LegalBoundary;
