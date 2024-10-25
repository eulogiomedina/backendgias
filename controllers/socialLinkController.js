const SocialLink = require('../models/SocialLink');

// Obtener todos los enlaces de redes sociales
exports.getAllSocialLinks = async (req, res) => {
    try {
        const links = await SocialLink.find();
        res.status(200).json(links);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los enlaces' });
    }
};

// Añadir un nuevo enlace de redes sociales
exports.createSocialLink = async (req, res) => {
    const { platform, url, status } = req.body;

    try {
        const newLink = new SocialLink({ platform, url, status });
        await newLink.save();
        res.status(201).json(newLink);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el enlace' });
    }
};

// Editar un enlace existente
exports.updateSocialLink = async (req, res) => {
    const { id } = req.params;
    const { platform, url, status } = req.body;

    try {
        const updatedLink = await SocialLink.findByIdAndUpdate(id, { platform, url, status }, { new: true });
        if (!updatedLink) {
            return res.status(404).json({ message: 'Enlace no encontrado' });
        }
        res.status(200).json(updatedLink);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el enlace' });
    }
};

// Eliminar un enlace
exports.deleteSocialLink = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedLink = await SocialLink.findByIdAndDelete(id);
        if (!deletedLink) {
            return res.status(404).json({ message: 'Enlace no encontrado' });
        }
        res.status(200).json({ message: 'Enlace eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el enlace' });
    }
};
