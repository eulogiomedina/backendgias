const express = require("express");
const router = express.Router();
const Pago = require("../models/Pago");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configurar Cloudinary usando variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurar almacenamiento en Cloudinary para comprobantes
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "comprobantes", // Carpeta en Cloudinary donde se guardarán los comprobantes
  allowedFormats: ["jpg", "png", "jpeg", "pdf"],
});
const upload = multer({ storage: storage });

// POST /api/pagos - Registrar un nuevo pago (con subida de comprobante)
router.post("/", upload.single("comprobante"), async (req, res) => {
  try {
    const { userId, planId, monto, fecha } = req.body;
    // Si se subió un archivo, multer lo procesa y nos proporciona la URL en req.file.path
    const comprobanteUrl = req.file ? req.file.path : "";
    
    if (!userId || !planId || !monto) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }
    
    const nuevoPago = new Pago({
      userId,
      planId,
      monto,
      fecha: fecha || new Date(),
      comprobanteUrl,
      estado: "pendiente"
    });
    
    await nuevoPago.save();
    res.json({ message: "Pago registrado con éxito", pago: nuevoPago });
  } catch (error) {
    console.error("❌ Error al registrar pago:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// GET /api/pagos/:userId - Obtener historial de pagos de un usuario
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const pagos = await Pago.find({ userId });
    res.json(pagos);
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;
