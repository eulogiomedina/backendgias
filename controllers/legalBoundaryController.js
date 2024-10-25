const LegalBoundary = require('../models/legalBoundaryModel');
const mongoose = require('mongoose');

// Obtener todos los deslindes legales
exports.getAllLegalBoundaries = async (req, res) => {
  try {
    const legalBoundaries = await LegalBoundary.find().select('title content version isCurrent createdAt');
    res.status(200).json(legalBoundaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo deslinde legal
exports.createLegalBoundary = async (req, res) => {
  try {
    // Desactivar todos los deslindes vigentes
    await LegalBoundary.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear el nuevo deslinde legal como vigente
    const lastLegalBoundary = await LegalBoundary.findOne().sort({ createdAt: -1 });
    const newVersion = lastLegalBoundary ? lastLegalBoundary.version + 1 : 1;

    const legalBoundary = new LegalBoundary({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true, // Este es el nuevo deslinde vigente
    });

    const savedLegalBoundary = await legalBoundary.save();
    res.status(201).json(savedLegalBoundary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener un deslinde legal por ID
exports.getLegalBoundaryById = async (req, res) => {
  try {
    const legalBoundary = await LegalBoundary.findById(req.params.id);
    if (!legalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    res.status(200).json(legalBoundary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un deslinde legal
exports.updateLegalBoundary = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de deslinde legal no válido' });
  }

  try {
    // Desactivar el deslinde vigente actual
    await LegalBoundary.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastLegalBoundary = await LegalBoundary.findById(req.params.id);
    if (!lastLegalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });

    const newVersion = lastLegalBoundary.version + 1;

    const updatedLegalBoundary = await LegalBoundary.create({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true, // Nuevo deslinde vigente
    });

    res.status(200).json(updatedLegalBoundary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un deslinde legal
exports.deleteLegalBoundary = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de deslinde legal no válido' });
  }

  try {
    const deletedLegalBoundary = await LegalBoundary.findByIdAndDelete(req.params.id);
    if (!deletedLegalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    res.status(204).send(); // No content response
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
