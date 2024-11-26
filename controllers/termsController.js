const Term = require('../models/Term');
const mongoose = require('mongoose');

// Obtener todos los términos (incluyendo eliminados)
exports.getAllTerms = async (req, res) => {
  try {
    // Obtiene todos los términos sin filtrar por isDeleted
    const terms = await Term.find({})
      .select('title content version isCurrent isDeleted createdAt')
      .sort({ createdAt: -1 }); // Ordenar por fecha de creación, descendente

    res.status(200).json(terms); // Enviar todos los términos como respuesta
  } catch (error) {
    res.status(500).json({ message: error.message }); // Manejar errores
  }
};

// Crear un nuevo término
exports.createTerm = async (req, res) => {
  try {
    // Desactivar todos los términos vigentes
    await Term.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastTerm = await Term.findOne().sort({ version: -1 });
    const newVersion = lastTerm ? lastTerm.version + 1 : 1;

    const term = new Term({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true, // Este será el nuevo término vigente
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
    const existingTerm = await Term.findById(req.params.id);
    if (!existingTerm) return res.status(404).json({ message: 'Término no encontrado' });

    // Buscar la versión más alta en toda la colección
    const lastTerm = await Term.findOne().sort({ version: -1 });
    const newVersion = lastTerm ? lastTerm.version + 1 : 1;

    // Crear una nueva versión del término
    const updatedTerm = new Term({
      title: req.body.title || existingTerm.title,
      content: req.body.content || existingTerm.content,
      version: newVersion,
      isCurrent: true,
    });

    // Desactivar todos los términos vigentes
    await Term.updateMany({ isCurrent: true }, { isCurrent: false });

    // Guardar la nueva versión
    const savedTerm = await updatedTerm.save();
    res.status(200).json(savedTerm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar lógicamente un término
exports.softDeleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const term = await Term.findById(id);
    if (!term) {
      return res.status(404).json({ message: 'Término no encontrado' });
    }

    term.isDeleted = true; // Cambiar el estado del término a eliminado lógicamente
    await term.save();

    res.status(200).json({ message: 'Término eliminado lógicamente' });
  } catch (error) {
    console.error('Error al eliminar el término:', error);
    res.status(500).json({ message: 'Error al eliminar el término' });
  }
};

// Restaurar un término eliminado
exports.restoreTerm = async (req, res) => {
  try {
    const term = await Term.findByIdAndUpdate(req.params.id, { isDeleted: false }, { new: true });
    if (!term) return res.status(404).json({ message: 'Término no encontrado' });
    res.status(200).json(term);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};