const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Tesseract = require("tesseract.js");
const router = express.Router();
const AhorroUsuario = require("../models/AhorroUsuario");

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuración de almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "credenciales",
  allowedFormats: ["jpg", "png", "jpeg"],
});
const upload = multer({ storage: storage });

// Registrar un ahorro: se guarda en el mismo documento del usuario
router.post("/", upload.single("credencial"), async (req, res) => {
  try {
    const { userId, monto, tipo, facebook } = req.body;
    if (!userId || !monto || !tipo) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // Buscar si ya existe un documento para este usuario
    let ahorroUsuario = await AhorroUsuario.findOne({ userId });

    let credencialUrl = "";
    let facebookValue = "";

    if (ahorroUsuario) {
      // Si ya existe, reutilizamos la credencial y facebook del primer ahorro
      credencialUrl = ahorroUsuario.ahorros[0].credencial;
      facebookValue = ahorroUsuario.ahorros[0].facebook;
    } else {
      // Si es el primer ahorro, se requiere la imagen y el facebook
      if (!req.file) {
        return res.status(400).json({ message: "Debes subir una imagen de tu credencial." });
      }
      // Subir imagen a Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      credencialUrl = uploadResult.secure_url;

      // Procesar OCR con Tesseract.js para validar la credencial
      const ocrResult = await Tesseract.recognize(credencialUrl, "spa");
      const detectedText = ocrResult.data.text;
      const palabrasClave = ["Instituto Nacional Electoral", "CURP", "Clave de Elector", "Nombre"];
      const esCredencial = palabrasClave.some(palabra => detectedText.includes(palabra));
      if (!esCredencial) {
        return res.status(400).json({ message: "La imagen subida no parece ser una credencial de lector." });
      }
      facebookValue = facebook;
    }

    // Crear el objeto ahorro
    const nuevoAhorro = {
      monto,
      tipo,
      facebook: facebookValue,
      credencial: credencialUrl,
      fechaInicio: new Date(),
    };

    if (ahorroUsuario) {
      ahorroUsuario.ahorros.push(nuevoAhorro);
      await ahorroUsuario.save();
    } else {
      ahorroUsuario = new AhorroUsuario({
        userId,
        ahorros: [nuevoAhorro],
      });
      await ahorroUsuario.save();
    }

    res.json({ message: "Ahorro guardado exitosamente.", ahorro: nuevoAhorro });
  } catch (error) {
    console.error("❌ Error en el servidor:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// Obtener todos los ahorros del usuario
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const ahorroUsuario = await AhorroUsuario.findOne({ userId });
    if (!ahorroUsuario || ahorroUsuario.ahorros.length === 0) {
      return res.status(404).json({ message: "No se encontraron ahorros para este usuario." });
    }
    res.json(ahorroUsuario.ahorros);
  } catch (error) {
    console.error("❌ Error al obtener ahorros:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;
