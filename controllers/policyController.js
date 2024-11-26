const Policy = require('../models/Policy');
const mongoose = require('mongoose');

// Obtener todas las políticas (incluyendo eliminadas)
exports.getAllPolicies = async (req, res) => {
  try {
    // Obtiene todas las políticas sin filtrar por isDeleted
    const policies = await Policy.find({})
      .select('title content version isCurrent isDeleted createdAt')
      .sort({ createdAt: -1 }); // Ordenar por fecha de creación, descendente

    res.status(200).json(policies); // Enviar todas las políticas como respuesta
  } catch (error) {
    res.status(500).json({ message: error.message }); // Manejar errores
  }
};


// Crear una nueva política
exports.createPolicy = async (req, res) => {
  try {
    // Desactivar todas las políticas vigentes
    await Policy.updateMany({ isCurrent: true }, { isCurrent: false });

    // Crear la nueva versión como vigente
    const lastPolicy = await Policy.findOne().sort({ version: -1 });
    const newVersion = lastPolicy ? lastPolicy.version + 1 : 1;

    const policy = new Policy({
      title: req.body.title,
      content: req.body.content,
      version: newVersion,
      isCurrent: true, // Esta será la nueva política vigente
    });

    const savedPolicy = await policy.save();
    res.status(201).json(savedPolicy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener una política por ID
exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Política no encontrada' });
    res.status(200).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar una política
exports.updatePolicy = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de política no válido' });
  }

  try {
    const existingPolicy = await Policy.findById(req.params.id);
    if (!existingPolicy) return res.status(404).json({ message: 'Política no encontrada' });

    // Buscar la versión más alta en toda la colección
    const lastPolicy = await Policy.findOne().sort({ version: -1 });
    const newVersion = lastPolicy ? lastPolicy.version + 1 : 1;

    // Crear una nueva versión de la política
    const updatedPolicy = new Policy({
      title: req.body.title || existingPolicy.title,
      content: req.body.content || existingPolicy.content,
      version: newVersion,
      isCurrent: true,
    });

    // Desactivar todas las políticas vigentes
    await Policy.updateMany({ isCurrent: true }, { isCurrent: false });

    // Guardar la nueva versión
    const savedPolicy = await updatedPolicy.save();
    res.status(200).json(savedPolicy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Eliminar lógicamente una política
exports.softDeletePolicy = async (req, res) => {
  try {
      const { id } = req.params;
      const policy = await Policy.findById(id);
      if (!policy) {
          return res.status(404).json({ message: 'Política no encontrada' });
      }

      policy.isDeleted = true; // Cambiar el estado de la política a eliminada lógicamente
      await policy.save();

      res.status(200).json({ message: 'Política eliminada lógicamente' });
  } catch (error) {
      console.error('Error al eliminar la política:', error);
      res.status(500).json({ message: 'Error al eliminar la política' });
  }
};


// Restaurar una política eliminada
exports.restorePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndUpdate(req.params.id, { isDeleted: false }, { new: true });
    if (!policy) return res.status(404).json({ message: 'Política no encontrada' });
    res.status(200).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};