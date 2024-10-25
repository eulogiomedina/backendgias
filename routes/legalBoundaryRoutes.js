const express = require('express');
const router = express.Router();
const legalBoundaryController = require('../controllers/legalBoundaryController');

// Obtener todos los deslindes legales
router.get('/', legalBoundaryController.getAllLegalBoundaries);

// Crear un nuevo deslinde legal
router.post('/', legalBoundaryController.createLegalBoundary);

// Obtener un deslinde legal por ID
router.get('/:id', legalBoundaryController.getLegalBoundaryById);

// Actualizar un deslinde legal por ID
router.put('/:id', legalBoundaryController.updateLegalBoundary);

// Eliminar un deslinde legal por ID
router.delete('/:id', legalBoundaryController.deleteLegalBoundary);

module.exports = router;
