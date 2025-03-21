const express = require('express');
const router = express.Router();
const termController = require('../controllers/termsController'); // Asegúrate de que la ruta es correcta

// Obtener todos los términos y condiciones
router.get('/', termController.getAllTerms);

// Crear nuevos términos y condiciones
router.post('/', termController.createTerm);

// Obtener un término por ID
router.get('/:id', termController.getTermById);

// Actualizar un término por ID
router.put('/:id', termController.updateTerm);

// Eliminar un término por ID (eliminación lógica)
router.delete('/delete/:id', termController.softDeleteTerm);

// Restaurar un término eliminado
router.put('/restore/:id', termController.restoreTerm);

module.exports = router;
