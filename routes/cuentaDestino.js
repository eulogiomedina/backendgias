const express = require("express");
const router = express.Router();
const CuentaDestino = require("../models/CuentaDestino");
const detectarBancoPorBIN = require("./detectarBancoAPI"); // 🔹 Importación nueva

// 📌 Registrar o actualizar la cuenta destino
router.post("/", async (req, res) => {
  try {
    let { titular, numeroCuenta, numeroTarjeta, banco } = req.body;

    if (!titular || !numeroCuenta) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // Detectar banco si no fue proporcionado
    if ((!banco || banco.trim() === "") && numeroTarjeta) {
      banco = await detectarBancoPorBIN(numeroTarjeta) || "Banco no identificado";
    }

    let cuenta = await CuentaDestino.findOne();

    if (cuenta) {
      cuenta.titular = titular;
      cuenta.numeroCuenta = numeroCuenta;
      cuenta.numeroTarjeta = numeroTarjeta || "";
      cuenta.banco = banco;
      await cuenta.save();
      return res.json({ message: "Cuenta destino actualizada.", cuenta });
    }

    const nuevaCuenta = new CuentaDestino({
      titular,
      numeroCuenta,
      numeroTarjeta: numeroTarjeta || "",
      banco
    });

    await nuevaCuenta.save();
    res.json({ message: "Cuenta destino registrada con éxito.", cuenta: nuevaCuenta });
  } catch (error) {
    console.error("❌ Error al registrar cuenta destino:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Obtener la cuenta destino registrada
router.get("/", async (req, res) => {
  try {
    const cuenta = await CuentaDestino.findOne();

    if (!cuenta) {
      return res.status(404).json({ message: "No hay cuenta destino registrada." });
    }

    res.json(cuenta);
  } catch (error) {
    console.error("❌ Error al obtener cuenta destino:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Detectar banco por número de tarjeta desde el frontend
router.get("/detectar-banco/:tarjeta", async (req, res) => {
  const { tarjeta } = req.params;

  if (!tarjeta || tarjeta.length < 6) {
    return res.status(400).json({ message: "Número de tarjeta no válido." });
  }

  try {
    const banco = await detectarBancoPorBIN(tarjeta);

    if (!banco) {
      return res.status(404).json({ message: "No se pudo detectar el banco." });
    }

    console.log("✅ Banco detectado:", banco); // ← Log útil para depurar

    res.json({ banco });
  } catch (error) {
    console.error("❌ Error al detectar banco:", error);
    res.status(500).json({ message: "Error al detectar banco." });
  }
});

module.exports = router;