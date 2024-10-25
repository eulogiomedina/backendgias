// controllers/policyController.js
const Policy = require('../models/Policy');

// Obtener todas las políticas
exports.getAllPolicies = async (req, res) => {
  try {
    const policies = await Policy.find();
    res.status(200).json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear una nueva política
exports.createPolicy = async (req, res) => {
  const policy = new Policy({
    title: req.body.title,
    content: req.body.content,
  });

  try {
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

// Actualizar una política por ID
exports.updatePolicy = async (req, res) => {
  try {
    const updatedPolicy = await Policy.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPolicy) return res.status(404).json({ message: 'Política no encontrada' });
    res.status(200).json(updatedPolicy);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar una política por ID
exports.deletePolicy = async (req, res) => {
  try {
    const deletedPolicy = await Policy.findByIdAndDelete(req.params.id);
    if (!deletedPolicy) return res.status(404).json({ message: 'Política no encontrada' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
