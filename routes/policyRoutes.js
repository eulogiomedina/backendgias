const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController'); // Asegúrate de que la ruta es correcta

// Obtener todas las políticas
router.get('/', policyController.getAllPolicies);

// Crear una nueva política
router.post('/', policyController.createPolicy);

// Obtener una política por ID
router.get('/:id', policyController.getPolicyById);

// Actualizar una política por ID
router.put('/:id', policyController.updatePolicy);

// Eliminación lógica de una política
router.delete('/delete/:id', policyController.softDeletePolicy);
router.put('/restore/:id', policyController.restorePolicy);

module.exports = router;
