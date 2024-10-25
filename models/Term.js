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
    default: true,
  },
}, { timestamps: true });

const Term = mongoose.model('Term', termSchema);

module.exports = Term;
