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

// ==================== POST / (Registrar uno o varios ahorros) ====================
router.post("/", upload.fields([
  { name: "credencial", maxCount: 1 },
  { name: "fotoPersona", maxCount: 1 }
]), async (req, res) => {
  try {
    const { userId, monto, tipo, facebook, numeros } = req.body;

    if (!userId || !monto || !tipo) {
      return res.status(400).json({ message: "Faltan datos obligatorios: userId, monto o tipo." });
    }

    // ✅ Obtener nombre desde User
    const User = require("../models/User");
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "Usuario no encontrado." });
    }

    const nombrePerfil = user.nombre; // O el campo real de tu modelo

    const numNumeros = parseInt(numeros) || 1; // Por defecto, 1

    // Verificar foto de persona
    if (!req.files || !req.files.fotoPersona || req.files.fotoPersona.length === 0) {
      return res.status(400).json({ message: "Debes subir una foto de la persona con cabello recogido." });
    }

    // Verificar credencial
    if (!req.files.credencial || req.files.credencial.length === 0) {
      return res.status(400).json({ message: "Debes subir una imagen de tu credencial de elector." });
    }

    // ✅ Subir foto de persona
    const fotoPersonaResult = await cloudinary.uploader.upload(req.files.fotoPersona[0].path);
    const fotoPersonaUrl = fotoPersonaResult.secure_url;

    // ✅ Subir credencial
    const credencialResult = await cloudinary.uploader.upload(req.files.credencial[0].path);
    const credencialUrl = credencialResult.secure_url;

    // OCR credencial
    const ocrCredencial = await Tesseract.recognize(credencialUrl, "spa");
    const textoCredencial = ocrCredencial.data.text;

    const palabrasClave = ["Instituto Nacional Electoral", "CURP", "Clave de Elector", "Nombre"];
    const esCredencial = palabrasClave.some((palabra) => textoCredencial.includes(palabra));
    if (!esCredencial) {
      return res.status(400).json({ message: "La imagen no parece ser una credencial de elector válida." });
    }

    // ✅ Validar nombre del perfil registrado
    const nombrePerfilLower = nombrePerfil.toLowerCase();
    if (!textoCredencial.toLowerCase().includes(nombrePerfilLower)) {
      return res.status(400).json({ message: "El nombre en la credencial no coincide con tu nombre registrado." });
    }

    // ✅ Crear o actualizar documento
    let ahorroUsuario = await AhorroUsuario.findOne({ userId });

    let facebookValue = facebook || "";
    let ordenInicio = ahorroUsuario ? ahorroUsuario.ahorros.length + 1 : 1;

    const nuevosAhorros = [];

    for (let i = 0; i < numNumeros; i++) {
      const nuevoAhorro = {
        monto,
        tipo,
        facebook: facebookValue,
        credencial: credencialUrl,
        fotoPersona: fotoPersonaUrl,
        nombrePerfil, // Guardar nombre validado
        fechaInicio: new Date(),
        orden: ordenInicio + i,
      };
      nuevosAhorros.push(nuevoAhorro);
    }

    if (ahorroUsuario) {
      ahorroUsuario.ahorros.push(...nuevosAhorros);
    } else {
      ahorroUsuario = new AhorroUsuario({
        userId,
        ahorros: nuevosAhorros
      });
    }

    await ahorroUsuario.save();
    return res.json({
      message: `Ahorro(s) guardado(s) exitosamente. Números asignados: ${numNumeros}`,
      nuevosAhorros
    });

  } catch (error) {
    console.error("❌ Error en el servidor:", error);
    res.status(500).json({ message: "Error en el servidor", error });
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
// ==================== GET / (Todos los ahorros-usuarios, para el directorio) ====================
router.get("/", async (req, res) => {
  try {
    const ahorrosUsuarios = await AhorroUsuario.find({});
    res.json(ahorrosUsuarios);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor", error });
  }
});


module.exports = router;
