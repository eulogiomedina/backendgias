const express = require('express');
const Slogan = require('../models/Slogan');
const router = express.Router();

// Obtener el eslogan actual
router.get('/', async (req, res) => {
    try {
        const slogan = await Slogan.findOne();
        if (!slogan) {
            return res.status(404).json({ message: 'No hay eslogan registrado' });
        }
        res.json(slogan);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el eslogan' });
    }
});

// Agregar o actualizar el eslogan
router.post('/', async (req, res) => {
    const { slogan } = req.body;

    if (!slogan || slogan.length > 100) {
        return res.status(400).json({ error: 'El eslogan no puede estar vacío ni tener más de 100 caracteres' });
    }

    try {
        // Busca un eslogan existente y actualízalo o crea uno nuevo
        const updatedSlogan = await Slogan.findOneAndUpdate({}, { slogan }, { new: true, upsert: true });
        res.status(201).json(updatedSlogan);
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el eslogan' });
    }
});

module.exports = router;
