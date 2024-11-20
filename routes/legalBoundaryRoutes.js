const express = require('express');
const router = express.Router();
const legalBoundaryController = require('../controllers/legalBoundaryController');

// Obtener todos los deslindes legales (excluyendo los eliminados por defecto)
router.get('/', legalBoundaryController.getAllLegalBoundaries);

// Crear un nuevo deslinde legal
router.post('/', legalBoundaryController.createLegalBoundary);

// Obtener un deslinde legal por ID
router.get('/:id', legalBoundaryController.getLegalBoundaryById);

// Actualizar un deslinde legal por ID
router.put('/:id', legalBoundaryController.updateLegalBoundary);

// Eliminación lógica de un deslinde legal
router.delete('/delete/:id', legalBoundaryController.softDeleteLegalBoundary);

// Restaurar un deslinde legal eliminado
router.put('/restore/:id', legalBoundaryController.restoreLegalBoundary);

module.exports = router;
