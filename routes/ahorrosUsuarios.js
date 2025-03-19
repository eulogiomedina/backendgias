// backendgias/routes/ahorrosUsuarios.js
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

// ==================== POST / (Registrar un ahorro) ====================
router.post("/", upload.single("credencial"), async (req, res) => {
  try {
    console.log("📌 [POST] /api/ahorros-usuarios - Iniciando proceso...");
    
    console.log("📌 Datos recibidos en `req.body`:", req.body);
    console.log("📌 Archivo recibido en `req.file`:", req.file);

    const { userId, monto, tipo, facebook } = req.body;

    if (!userId || !monto || !tipo) {
      console.error("🚨 Error: Faltan datos obligatorios.");
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // Buscar si ya existe un documento para este usuario
    let ahorroUsuario = await AhorroUsuario.findOne({ userId });

    let credencialUrl = "";
    let facebookValue = "";

    if (ahorroUsuario) {
      console.log("📌 Usuario encontrado, actualizando ahorro...");
      credencialUrl = ahorroUsuario.ahorros[0].credencial;
      facebookValue = ahorroUsuario.ahorros[0].facebook;
      const nuevoOrden = ahorroUsuario.ahorros.length + 1;
      const nuevoAhorro = {
        monto,
        tipo,
        facebook: facebookValue,
        credencial: credencialUrl,
        fechaInicio: new Date(),
        orden: nuevoOrden,
      };

      ahorroUsuario.ahorros.push(nuevoAhorro);
      await ahorroUsuario.save();
      console.log("✅ Ahorro actualizado correctamente.");
      return res.json({ message: "Ahorro guardado exitosamente.", ahorro: nuevoAhorro });
    } else {
      console.log("📌 Nuevo usuario detectado, creando primer ahorro...");
      
      if (!req.file) {
        console.error("🚨 Error: No se recibió imagen de credencial.");
        return res.status(400).json({ message: "Debes subir una imagen de tu credencial." });
      }

      console.log("📌 Subiendo imagen a Cloudinary...");
      const uploadResult = await cloudinary.uploader.upload(req.file.path);
      console.log("📌 Imagen subida con éxito:", uploadResult.secure_url);
      
      credencialUrl = uploadResult.secure_url;
      facebookValue = facebook;

      const nuevoAhorro = {
        monto,
        tipo,
        facebook: facebookValue,
        credencial: credencialUrl,
        fechaInicio: new Date(),
        orden: 1,
      };

      ahorroUsuario = new AhorroUsuario({
        userId,
        ahorros: [nuevoAhorro],
      });

      await ahorroUsuario.save();
      console.log("✅ Ahorro guardado exitosamente.");
      return res.json({ message: "Ahorro guardado exitosamente.", ahorro: nuevoAhorro });
    }
  } catch (error) {
    console.error("❌ Error en el servidor:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});


// ==================== GET /:userId (Obtener todos los ahorros del usuario) ====================
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

// ==================== GET /gestion-cuenta/:userId (Info detallada de la tanda activa) ====================
router.get("/gestion-cuenta/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const ahorroUsuario = await AhorroUsuario.findOne({ userId });
    if (!ahorroUsuario || ahorroUsuario.ahorros.length === 0) {
      return res.status(404).json({ message: "No se encontraron ahorros para este usuario." });
    }

    // Tomamos el último ahorro como el "activo"
    const activeAhorro = ahorroUsuario.ahorros[ahorroUsuario.ahorros.length - 1];

    // Determinar la frecuencia en días según el tipo
    let frecuenciaDays = 7; // Por defecto, Semanal
    const tipoLower = activeAhorro.tipo.toLowerCase();
    if (tipoLower === "quincenal") {
      frecuenciaDays = 15;
    } else if (tipoLower === "mensual") {
      frecuenciaDays = 30;
    }

    const fechaInicio = new Date(activeAhorro.fechaInicio);
    // Usamos el campo 'orden' para calcular el turno específico:
    const orden = activeAhorro.orden || 1;
    const proximoPago = new Date(
      fechaInicio.getTime() + (orden) * frecuenciaDays * 24 * 60 * 60 * 1000
    );

    // Verificar atraso (si la fecha actual ya pasó la fecha programada)
    const now = new Date();
    const estaAtrasado = now > proximoPago && !activeAhorro.usuarioHaPagado;

    // Calcular ciclos restantes usando el orden en la tanda:
    const totalCiclos = activeAhorro.totalCiclos || 10;
    const ciclosRestantes = totalCiclos - orden;

    // Retornamos la info del ahorro activo + datos calculados
    res.json({
      ...activeAhorro.toObject(),
      proximoPago,
      estaAtrasado,
      ciclosRestantes,
      orden, // incluir el orden para referencia
    });
  } catch (error) {
    console.error("❌ Error en GET /gestion-cuenta/:userId:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;
