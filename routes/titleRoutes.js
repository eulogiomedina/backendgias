const express = require('express');
const Title = require('../models/Title');
const router = express.Router();

// Obtener el título actual
router.get('/', async (req, res) => {
    try {
        const title = await Title.findOne();
        if (!title) {
            return res.status(404).json({ message: 'No hay título registrado' });
        }
        res.json(title);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el título' });
    }
});

// Agregar o actualizar el título
router.post('/', async (req, res) => {
    const { title } = req.body;

    if (!title || title.length > 50) {
        return res.status(400).json({ error: 'El título no puede estar vacío ni tener más de 50 caracteres' });
    }

    try {
        // Busca un título existente y actualízalo o crea uno nuevo
        const updatedTitle = await Title.findOneAndUpdate({}, { title }, { new: true, upsert: true });
        res.status(201).json(updatedTitle);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el título' });
    }
});

module.exports = router;
