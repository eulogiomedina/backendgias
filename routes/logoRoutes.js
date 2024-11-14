const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Logo = require('../models/Logo'); // Asegúrate de importar tu modelo

const router = express.Router();

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    folder: 'logos', // Carpeta donde se guardarán los logos
    allowedFormats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }], // Opcional: transformaciones
});

const upload = multer({ storage: storage });

// Ruta para subir el logo
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
        }

        // Guardar la URL en la base de datos
        const logo = new Logo({
            url: req.file.path, // La URL del logo en Cloudinary
        });

        await logo.save(); // Guardar el logo en la base de datos
        
        // Cambia la respuesta para que solo muestre el mensaje
        res.status(200).json({ message: 'Logo subido exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al subir el logo' });
    }
});

// Ruta para obtener solo el último logo
router.get('/', async (req, res) => {
    try {
        const logo = await Logo.findOne().sort({ uploadDate: -1 }); // Trae el logo más reciente
        res.json([logo]); // Regresa como un arreglo para mantener la estructura
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener el logo' });
    }
});

// Exportar las rutas
module.exports = router;