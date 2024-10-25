const express = require('express');
const router = express.Router();
const socialLinkController = require('../controllers/socialLinkController');

// Rutas CRUD para los enlaces de redes sociales
router.get('/', socialLinkController.getAllSocialLinks);  // Now accessible at /api/social-links
router.post('/', socialLinkController.createSocialLink);  // Now accessible at /api/social-links
router.put('/:id', socialLinkController.updateSocialLink);  // Now accessible at /api/social-links/:id
router.delete('/:id', socialLinkController.deleteSocialLink);  // Now accessible at /api/social-links/:id

module.exports = router;
