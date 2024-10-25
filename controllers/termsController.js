const Term = require('../models/Term');
const mongoose = require('mongoose');

// Obtener todos los términos y condiciones
exports.getAllTerms = async (req, res) => {
  try {
    const terms = await Term.find().select('title content version isCurrent createdAt');
    res.status(200).json(terms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear nuevos términos y condiciones
exports.createTerm = async (req, res) => {
  try {
    // Desactivar todos los términos vigentes
    await Term.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastTerm = await Term.findOne().sort({ createdAt: -1 });
    const newVersion = lastTerm ? lastTerm.version + 1 : 1;

    const term = new Term({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true,
    });

    const savedTerm = await term.save();
    res.status(201).json(savedTerm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener un término por ID
exports.getTermById = async (req, res) => {
  try {
    const term = await Term.findById(req.params.id);
    if (!term) return res.status(404).json({ message: 'Término no encontrado' });
    res.status(200).json(term);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un término
exports.updateTerm = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de término no válido' });
  }

  try {
    // Desactivar el término vigente actual
    await Term.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastTerm = await Term.findById(req.params.id);
    if (!lastTerm) return res.status(404).json({ message: 'Término no encontrado' });
    
    const newVersion = lastTerm.version + 1;

    const updatedTerm = new Term({
      title: req.body.title || lastTerm.title,
      content: req.body.content || lastTerm.content,
      version: newVersion,
      isCurrent: true,
    });

    const savedTerm = await updatedTerm.save();
    res.status(200).json(savedTerm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un término
exports.deleteTerm = async (req, res) => {
  try {
    const deletedTerm = await Term.findByIdAndDelete(req.params.id);
    if (!deletedTerm) return res.status(404).json({ message: 'Término no encontrado' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
