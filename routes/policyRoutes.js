// routes/policyRoutes.js
const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policyController');

router.get('/', policyController.getAllPolicies);
router.post('/', policyController.createPolicy);
router.get('/:id', policyController.getPolicyById);
router.put('/:id', policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);

module.exports = router;
