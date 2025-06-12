const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Tanda = require("../models/Tanda");
const { enviarRecordatorioPago } = require("../utils/emailService");


// 📌 Crear o unirse a una tanda con validaciones corregidas
router.post("/", async (req, res) => {
  try {
    console.log("📩 Datos recibidos en /api/tandas:", req.body);
    const { monto, tipo, userId } = req.body;

    if (!monto || !tipo || !userId) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    let tanda = await Tanda.findOne({ monto, tipo, iniciada: false });

    if (tanda && tanda.participantes.length < tanda.totalCiclos) {
      if (tanda.participantes.some(p => p.userId.equals(userObjectId))) {
        return res.status(400).json({ message: "El usuario ya está en esta tanda." });
      }

      // Agregar nuevo participante
      tanda.participantes.push({ userId: userObjectId, orden: tanda.participantes.length + 1 });

      // 🔥 Recalcular fechas de pago
      tanda = await actualizarFechasPago(tanda);

      await tanda.save();
      return res.json({ message: "Te uniste a la tanda exitosamente.", tanda });
    } 
    
    // Si no existe la tanda, crearla y calcular fechas
    else {
      const nuevaTanda = new Tanda({ 
        monto, 
        tipo, 
        participantes: [{ userId: userObjectId, orden: 1 }],
        fechaInicio: new Date()
      });

      // 🔥 Recalcular fechas de pago para la nueva tanda
      const tandaConFechas = await actualizarFechasPago(nuevaTanda);

      await tandaConFechas.save();
      return res.json({ message: "Tanda creada exitosamente.", tanda: tandaConFechas });
    }
  } catch (error) {
    console.error("❌ ERROR DETECTADO EN POST /api/tandas:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});


// 📌 Iniciar tanda manualmente
router.patch("/:tandaId/iniciar", async (req, res) => {
  try {
    const { tandaId } = req.params;
    const tanda = await Tanda.findById(tandaId);
    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });

    tanda.iniciada = true;
    tanda.fechaInicio = tanda.fechaInicio || new Date();
    await tanda.save();
    res.json({ message: "Tanda iniciada exitosamente.", tanda });
  } catch (error) {
    console.error("❌ Error al iniciar tanda:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Obtener todas las tandas en las que un usuario participa
router.get("/gestion-cuenta-all/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Buscar todas las tandas donde el usuario sea un participante
    const tandas = await Tanda.find({ "participantes.userId": userObjectId })
      .populate("participantes.userId", "nombre apellidos correo telefono");

    if (!tandas || tandas.length === 0) {
      return res.status(404).json({ message: "No se encontraron tandas para este usuario." });
    }

    res.json(tandas);
  } catch (error) {
    console.error("❌ Error en GET /api/tandas/gestion-cuenta-all/:userId:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

async function actualizarFechasPago(tanda) {
  if (!tanda.fechaInicio) {
    tanda.fechaInicio = new Date();
  }

  let fechaBase = new Date(tanda.fechaInicio);
  let intervalo = { Semanal: 7, Quincenal: 14, Mensual: 30 }[tanda.tipo] || 7;
  let totalParticipantes = tanda.participantes.length;

  let fechasPago = [];

  for (let ciclo = 0; ciclo < totalParticipantes; ciclo++) {
    let fechaPago = new Date(fechaBase);
    fechaPago.setUTCDate(fechaPago.getUTCDate() + (ciclo * intervalo));

    let fechaRecibo = new Date(fechaPago);
    fechaRecibo.setUTCDate(fechaPago.getUTCDate() + 1);

    tanda.participantes.forEach((participante, index) => {
      let fechaPagoFinal = index === ciclo ? null : fechaPago.toISOString();
      let fechaReciboFinal = index === ciclo ? fechaRecibo.toISOString() : null;

      fechasPago.push({
        userId: participante.userId,
        fechaPago: fechaPagoFinal,
        fechaRecibo: fechaReciboFinal,
      });
    });
  }

  tanda.fechasPago = fechasPago;
  return tanda;
}


// 📌 Registrar pago de un usuario
router.post("/:tandaId/pagar", async (req, res) => {
  try {
    const { tandaId } = req.params;
    const { userId } = req.body;
    const tanda = await Tanda.findById(tandaId);

    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });

    const participante = tanda.participantes.find(p => p.userId.toString() === userId);
    if (!participante) return res.status(404).json({ message: "Usuario no está en la tanda." });

    participante.usuarioHaPagado = true;
    await tanda.save();
    res.json({ message: "Pago registrado exitosamente." });
  } catch (error) {
    console.error("❌ Error en POST /api/tandas/:tandaId/pagar:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Obtener tanda por userId (Para los usuarios en `GestionCuenta`)
router.get("/gestion-cuenta/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const tanda = await Tanda.findOne({ "participantes.userId": userObjectId })
      .populate("participantes.userId", "nombre apellidos correo telefono");

    if (!tanda) {
      return res.status(404).json({ message: "No se encontró tanda para este usuario." });
    }

    tanda.participantes.sort((a, b) => a.orden - b.orden);

    const posicionUsuario = tanda.participantes.findIndex(p => p.userId.equals(userObjectId)) + 1;
    const faltantesParaLlenarse = tanda.totalCiclos - tanda.participantes.length;

    res.json({ 
      ...tanda.toObject(), 
      posicionUsuario, 
      faltantesParaLlenarse 
    });
  } catch (error) {
    console.error("❌ Error en GET /api/tandas/gestion-cuenta/:userId:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});


// 📌 Obtener todas las tandas para el panel de administración
router.get("/", async (req, res) => {
  try {
    // Aseguramos que se traen más datos del usuario
    const tandas = await Tanda.find().populate("participantes.userId", "nombre apellidos correo telefono");
    res.json(tandas);
  } catch (error) {
    console.error("❌ Error en GET /api/tandas:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});


// 📌 Definir fecha de inicio de una tanda
router.patch("/:tandaId/definir-fecha", async (req, res) => {
  try {
    const { tandaId } = req.params;
    const { fechaInicio } = req.body;

    if (!fechaInicio) {
      return res.status(400).json({ message: "Debe proporcionar una fecha de inicio válida." });
    }

    let tanda = await Tanda.findById(tandaId).populate("participantes.userId", "nombre apellidos correo telefono");
    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });

    let fechaBase = new Date(fechaInicio);
    fechaBase.setUTCHours(0, 0, 0, 0); // Asegurar que se guarde en UTC
    tanda.fechaInicio = fechaBase;
    tanda.estado = 'Activa';  // ✅ Marcar la tanda como activa al definir la fecha

    let intervalo = { Semanal: 7, Quincenal: 14, Mensual: 30 }[tanda.tipo] || 7;
    let totalParticipantes = tanda.participantes.length;

    let fechasPago = [];

    for (let ciclo = 0; ciclo < totalParticipantes; ciclo++) {
      let fechaPago = new Date(fechaBase);
      fechaPago.setUTCDate(fechaPago.getUTCDate() + (ciclo * intervalo));

      let fechaRecibo = new Date(fechaPago);
      fechaRecibo.setUTCDate(fechaPago.getUTCDate() + 1); // ✅ Un día después

      tanda.participantes.forEach((participante, index) => {
        let fechaPagoFinal = index === ciclo ? null : fechaPago.toISOString();
        let fechaReciboFinal = index === ciclo ? fechaRecibo.toISOString() : null; // ✅ Si "Le toca", su fecha de recibo es un día después

        // 🔥 LOG ESPECIAL PARA VER EL `fechaRecibo` QUE SE GUARDA
        console.log(`📌 Usuario: ${participante.userId.nombre} - Fecha Recibo: ${fechaReciboFinal}`);

        fechasPago.push({
          userId: participante.userId._id,
          fechaPago: fechaPagoFinal,
          fechaRecibo: fechaReciboFinal,
        });
      });
    }

    tanda.fechasPago = fechasPago;
    await tanda.save();

    console.log("📌 Fechas de pago generadas correctamente en UTC:", tanda.fechasPago);

    // 🔥 Enviar notificación a cada participante
    for (const participante of tanda.participantes) {
      const usuario = participante.userId;
      
      const fechaPagoUsuario = tanda.fechasPago.find(fp => fp.userId.toString() === usuario._id.toString() && fp.fechaPago !== null);

      if (fechaPagoUsuario) {
        try {
          await enviarRecordatorioPago(usuario, tanda, new Date(fechaPagoUsuario.fechaPago));
        } catch (err) {
          console.error(`❌ Error al enviar recordatorio a ${usuario.correo}:`, err);
        }
      } else {
        console.log(`⚠️ No se encontró fecha de pago para el usuario ${usuario.correo}, no se envía correo.`);
      }
    }

   
    console.log("📌 Fechas de pago generadas correctamente en UTC:", tanda.fechasPago);
    res.json({ message: "Fecha de inicio definida y fechas de pago generadas correctamente.", tanda });
  } catch (error) {
    console.error("❌ Error en PATCH /api/tandas/:tandaId/definir-fecha:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

router.patch("/:tandaId/actualizar-ciclos", async (req, res) => {
  try {
    const { tandaId } = req.params;
    const { totalCiclos } = req.body;

    // Verificar si el total de ciclos es válido
    if (!totalCiclos || isNaN(totalCiclos) || totalCiclos <= 0) {
      return res.status(400).json({ message: "El número de participantes debe ser mayor a 0." });
    }

    // Actualizar la tanda
    const tanda = await Tanda.findByIdAndUpdate(
      tandaId,
      { totalCiclos },
      { new: true }
    );

    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });

    res.json({ message: "Número máximo de participantes actualizado.", tanda });
  } catch (error) {
    console.error("❌ Error en PATCH /api/tandas/:tandaId/actualizar-ciclos:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

router.patch("/:tandaId/actualizar", async (req, res) => {
  try {
    const { tandaId } = req.params;
    const { fechaInicio, totalCiclos } = req.body;

    if (!fechaInicio || !totalCiclos || isNaN(totalCiclos) || totalCiclos <= 0) {
      return res.status(400).json({ message: "Datos inválidos. Verifique fecha de inicio y número de participantes." });
    }

    const tanda = await Tanda.findByIdAndUpdate(
      tandaId,
      { fechaInicio, totalCiclos },
      { new: true }
    );

    if (!tanda) {
      return res.status(404).json({ message: "Tanda no encontrada." });
    }

    res.json({ message: "Tanda actualizada exitosamente.", tanda });
  } catch (error) {
    console.error("❌ Error en PATCH /api/tandas/:tandaId/actualizar:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});
// 📌 Iniciar tanda y guardar fechas de pago
router.patch("/:tandaId/iniciar", async (req, res) => {
  try {
    const { tandaId } = req.params;
    let tanda = await Tanda.findById(tandaId);

    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });
    if (tanda.iniciada) return res.status(400).json({ message: "La tanda ya ha sido iniciada." });

    tanda.iniciada = true;
    await tanda.save();

    console.log("📌 Tanda iniciada correctamente.");

    res.json({ message: "Tanda iniciada exitosamente.", tanda });
  } catch (error) {
    console.error("❌ Error al iniciar tanda:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Eliminar una tanda
router.delete("/:tandaId", async (req, res) => {
  try {
    const { tandaId } = req.params;
    await Tanda.findByIdAndDelete(tandaId);
    res.json({ message: "Tanda eliminada exitosamente." });
  } catch (error) {
    console.error("❌ Error en DELETE /api/tandas/:tandaId:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

module.exports = router;
