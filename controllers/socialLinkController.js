const { check, validationResult } = require('express-validator');
const SocialLink = require('../models/SocialLink');

// Obtener todos los enlaces de redes sociales
exports.getAllSocialLinks = async (req, res) => {
    try {
        const links = await SocialLink.find();
        res.status(200).json(links);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los enlaces', error: error.message });
    }
};

// Añadir un nuevo enlace de redes sociales con validación
exports.createSocialLink = [
    // Validar datos de entrada
    check('platform')
        .notEmpty()
        .withMessage('La plataforma es obligatoria')
        .isIn(['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'Other'])
        .withMessage('Plataforma no válida'),
    check('url')
        .notEmpty()
        .withMessage('La URL es obligatoria')
        .isURL()
        .withMessage('Formato de URL no válido'),
    check('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Estado no válido'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { platform, url, status } = req.body;

        try {
            // Verificar si ya existe un enlace para la misma plataforma
            const existingLink = await SocialLink.findOne({ platform });
            if (existingLink) {
                return res.status(400).json({ message: `Ya existe un enlace de ${platform}` });
            }

            // Verificar si el enlace pertenece a la plataforma correspondiente
            const platformCheck = {
                'Facebook': /facebook\.com/,
                'Twitter': /twitter\.com/,
                'LinkedIn': /linkedin\.com/,
                'Instagram': /instagram\.com/,
                'Other': /.*/, // No se valida en caso de "Other"
            };

            // Asegurarnos que el enlace coincida con la plataforma correspondiente
            const platformRegex = platformCheck[platform];

            // Verificar si la URL es válida para la plataforma correspondiente
            if (platformRegex && !platformRegex.test(url)) {
                return res.status(400).json({ message: `El enlace no pertenece a la plataforma ${platform}` });
            }

            // Si la URL es "localhost", no permitirlo para plataformas específicas
            if (url.includes('localhost') && platform !== 'Other') {
                return res.status(400).json({ message: `No se permite "localhost" para la plataforma ${platform}` });
            }

            const newLink = new SocialLink({ platform, url, status });
            await newLink.save();
            res.status(201).json(newLink);
        } catch (error) {
            res.status(500).json({ message: 'Error al crear el enlace', error: error.message });
        }
    },
];

// Editar un enlace existente con validación
exports.updateSocialLink = [
    // Validar datos de entrada
    check('platform')
        .optional()
        .isIn(['Facebook', 'Twitter', 'LinkedIn', 'Instagram', 'Other'])
        .withMessage('Plataforma no válida'),
    check('url')
        .optional()
        .isURL()
        .withMessage('Formato de URL no válido'),
    check('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Estado no válido'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { platform, url, status } = req.body;

        try {
            const updatedLink = await SocialLink.findByIdAndUpdate(id, { platform, url, status }, { new: true });
            if (!updatedLink) {
                return res.status(404).json({ message: 'Enlace no encontrado' });
            }
            res.status(200).json(updatedLink);
        } catch (error) {
            res.status(500).json({ message: 'Error al actualizar el enlace', error: error.message });
        }
    },
];

// Eliminar un enlace
exports.deleteSocialLink = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedLink = await SocialLink.findByIdAndDelete(id);
        if (!deletedLink) {
            return res.status(404).json({ message: 'Enlace no encontrado' });
        }
        res.status(200).json({ message: 'Enlace eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el enlace', error: error.message });
    }
};
