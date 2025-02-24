const express = require("express");
const router = express.Router();
const Ahorro = require("../models/NuevoAhorro");

// Obtener todos los tipos de ahorro
router.get("/", async (req, res) => {
  try {
    const ahorros = await Ahorro.find();
    res.json(ahorros);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los tipos de ahorro", error });
  }
});

// Agregar un nuevo tipo de ahorro con fecha automática
router.post("/", async (req, res) => {
  try {
    const { monto, tipo } = req.body;
    if (!monto || !tipo) return res.status(400).json({ message: "Monto y tipo son obligatorios" });

    if (!["Semanal", "Quincenal", "Mensual"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo de ahorro no válido" });
    }

    const nuevoAhorro = new Ahorro({ monto, tipo, fechaCreacion: new Date() });
    await nuevoAhorro.save();
    res.json(nuevoAhorro);
  } catch (error) {
    res.status(500).json({ message: "Error al agregar el ahorro", error });
  }
});

// Actualizar un ahorro existente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, tipo } = req.body;

    if (!monto || !tipo) return res.status(400).json({ message: "Monto y tipo son obligatorios" });

    if (!["Semanal", "Quincenal", "Mensual"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo de ahorro no válido" });
    }

    const ahorroActualizado = await Ahorro.findByIdAndUpdate(id, { monto, tipo }, { new: true });

    if (!ahorroActualizado) return res.status(404).json({ message: "Ahorro no encontrado" });

    res.json(ahorroActualizado);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el ahorro", error });
  }
});

// Eliminar un ahorro
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ahorroEliminado = await Ahorro.findByIdAndDelete(id);
    if (!ahorroEliminado) return res.status(404).json({ message: "Ahorro no encontrado" });

    res.json({ message: "Ahorro eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el ahorro", error });
  }
});

module.exports = router;
