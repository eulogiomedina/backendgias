const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

router.get('/', accountController.getAllAccounts);
router.delete('/:id', accountController.deleteAccount);
router.put('/:id', accountController.updateAccount);  // Ruta para editar

module.exports = router;
