const LegalBoundary = require('../models/legalBoundaryModel');
const mongoose = require('mongoose');

// Obtener todos los deslindes legales (incluyendo eliminados)
exports.getAllLegalBoundaries = async (req, res) => {
  try {
    // Obtiene todos los deslindes legales sin filtrar por isDeleted
    const legalBoundaries = await LegalBoundary.find({})
      .select('title content version isCurrent isDeleted createdAt')
      .sort({ createdAt: -1 }); // Ordenar por fecha de creación, descendente

    res.status(200).json(legalBoundaries); // Enviar todos los deslindes legales como respuesta
  } catch (error) {
    res.status(500).json({ message: error.message }); // Manejar errores
  }
};

// Crear un nuevo deslinde legal
exports.createLegalBoundary = async (req, res) => {
  try {
    // Desactivar todos los deslindes legales vigentes
    await LegalBoundary.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastLegalBoundary = await LegalBoundary.findOne().sort({ version: -1 });
    const newVersion = lastLegalBoundary ? lastLegalBoundary.version + 1 : 1;

    const legalBoundary = new LegalBoundary({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true, // Este será el nuevo deslinde legal vigente
    });

    const savedLegalBoundary = await legalBoundary.save();
    res.status(201).json(savedLegalBoundary); // Enviar el deslinde legal guardado
  } catch (error) {
    res.status(400).json({ message: error.message }); // Manejar errores
  }
};

// Obtener un deslinde legal por ID
exports.getLegalBoundaryById = async (req, res) => {
  try {
    const legalBoundary = await LegalBoundary.findById(req.params.id);
    if (!legalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    res.status(200).json(legalBoundary); // Enviar el deslinde legal encontrado
  } catch (error) {
    res.status(500).json({ message: error.message }); // Manejar errores
  }
};

// Actualizar un deslinde legal
exports.updateLegalBoundary = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de deslinde legal no válido' });
  }

  try {
    const existingLegalBoundary = await LegalBoundary.findById(req.params.id);
    if (!existingLegalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });

    // Buscar la versión más alta en toda la colección
    const lastLegalBoundary = await LegalBoundary.findOne().sort({ version: -1 });
    const newVersion = lastLegalBoundary ? lastLegalBoundary.version + 1 : 1;

    // Crear una nueva versión del deslinde legal
    const updatedLegalBoundary = new LegalBoundary({
      title: req.body.title || existingLegalBoundary.title,
      content: req.body.content || existingLegalBoundary.content,
      version: newVersion,
      isCurrent: true, // Marcar la nueva versión como vigente
    });

    // Desactivar todos los deslindes legales vigentes
    await LegalBoundary.updateMany({ isCurrent: true }, { isCurrent: false });

    // Guardar la nueva versión
    const savedLegalBoundary = await updatedLegalBoundary.save();
    res.status(200).json(savedLegalBoundary); // Enviar el deslinde legal actualizado
  } catch (error) {
    res.status(400).json({ message: error.message }); // Manejar errores
  }
};

// Eliminar lógicamente un deslinde legal
exports.softDeleteLegalBoundary = async (req, res) => {
  try {
    const { id } = req.params;
    const legalBoundary = await LegalBoundary.findById(id);
    if (!legalBoundary) {
      return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    }

    legalBoundary.isDeleted = true; // Cambiar el estado del deslinde legal a eliminado lógicamente
    await legalBoundary.save();

    res.status(200).json({ message: 'Deslinde legal eliminado lógicamente' });
  } catch (error) {
    console.error('Error al eliminar el deslinde legal:', error);
    res.status(500).json({ message: 'Error al eliminar el deslinde legal' });
  }
};

// Restaurar un deslinde legal eliminado
exports.restoreLegalBoundary = async (req, res) => {
  try {
    const legalBoundary = await LegalBoundary.findByIdAndUpdate(req.params.id, { isDeleted: false }, { new: true });
    if (!legalBoundary) return res.status(404).json({ message: 'Deslinde legal no encontrado' });
    res.status(200).json(legalBoundary); // Enviar el deslinde legal restaurado
  } catch (error) {
    res.status(500).json({ message: error.message }); // Manejar errores
  }
};