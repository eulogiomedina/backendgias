const express = require("express");
const router = express.Router();
const NotificacionWearOS = require("../models/NotificacionWearOS");
const User = require("../models/User");

/**
 * ✅ Crear una notificación
 * POST /api/notificaciones
 * body: { userId, tipo, titulo, mensaje }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, tipo, titulo, mensaje } = req.body;
    if (!userId || !tipo || !titulo || !mensaje) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }

    const notificacion = await NotificacionWearOS.create({
      userId,
      tipo,
      titulo,
      mensaje,
    });

    res.json({ success: true, message: "Notificación creada", notificacion });
  } catch (err) {
    console.error("❌ Error creando notificación:", err);
    res.status(500).json({ message: "Error al crear notificación" });
  }
});

/**
 * ✅ Obtener notificaciones por usuario
 * GET /api/notificaciones/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const notificaciones = await NotificacionWearOS.find({
      userId: req.params.userId,
    }).sort({ fecha: -1 });

    res.json(notificaciones);
  } catch (err) {
    console.error("❌ Error obteniendo notificaciones:", err);
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
});

/**
 * ✅ Marcar una notificación como leída
 * PUT /api/notificaciones/:id/leido
 */
router.put("/:id/leido", async (req, res) => {
  try {
    const notificacion = await NotificacionWearOS.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );
    if (!notificacion) return res.status(404).json({ message: "No encontrada" });
    res.json({ success: true, notificacion });
  } catch (err) {
    console.error("❌ Error marcando como leída:", err);
    res.status(500).json({ message: "Error al marcar como leída" });
  }
});

/**
 * ✅ Eliminar todas las notificaciones leídas (limpieza)
 * DELETE /api/notificaciones/limpiar/:userId
 */
router.delete("/limpiar/:userId", async (req, res) => {
  try {
    await NotificacionWearOS.deleteMany({ userId: req.params.userId, leida: true });
    res.json({ success: true, message: "Notificaciones leídas eliminadas" });
  } catch (err) {
    console.error("❌ Error limpiando notificaciones:", err);
    res.status(500).json({ message: "Error al limpiar notificaciones" });
  }
});

module.exports = router;
