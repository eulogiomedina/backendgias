const express = require("express");
const router = express.Router();
const Pago = require("../models/Pago");
const CuentaDestino = require("../models/CuentaDestino");
const Tanda = require("../models/Tanda");
const User = require("../models/User");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const Tesseract = require("tesseract.js");
const { enviarNotificacionEstadoPago, enviarNotificacionAtraso } = require("../utils/emailService");

// 📦 Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📂 Configuración de Multer con Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "comprobantes",
  allowedFormats: ["jpg", "png", "jpeg"],
});
const upload = multer({ storage: storage });

// 🔍 OCR para validar comprobantes automáticamente
const validarPagoAutomatico = async (comprobanteUrl, montoEsperado, cuentaDestino, fechaProgramada) => {
  try {
    const { data } = await Tesseract.recognize(comprobanteUrl, "eng");
    const textoExtraido = data.text.toLowerCase();

    console.log("📌 Texto extraído del comprobante:", textoExtraido);

    const errores = [];
    let montoDetectado = null;
    let fechaDetectada = null;
    let conPenalizacion = false;

    // 🧠 Buscar monto detectado en el texto con mayor precisión
    // 🧠 Buscar monto detectado en el texto con mayor precisión
  const montoClaveRegex = /(monto|importe|total|transferencia|mxn)[^\d]{0,10}(\$?\s*\d{2,5}(?:[\.,]\d{2})?)/gi;
  const coincidenciaClave = textoExtraido.match(montoClaveRegex);

  if (coincidenciaClave && coincidenciaClave.length > 0) {
    const montoStr = coincidenciaClave[0].match(/\d{2,5}(?:[\.,]\d{2})?/);
    if (montoStr) {
      montoDetectado = parseFloat(montoStr[0].replace(",", "."));
    }
  }


    // 🛑 Respaldo: buscar montos aislados razonables
    if (!montoDetectado) {
      const montoMatches = [...textoExtraido.matchAll(/\$?\s*(\d{2,5}(?:[\.,]\d{2})?)/g)];
      if (montoMatches.length > 0) {
        const montosPosibles = montoMatches
          .map(m => parseFloat(m[1].replace(",", ".")))
          .filter(n => n >= 10 && n <= 10000); // evitar valores irrelevantes como 3.00 o 1021
        if (montosPosibles.length > 0) {
          montoDetectado = montosPosibles[0]; // Primer monto razonable
        }
      }
    }

    console.log("💵 Monto detectado:", montoDetectado);

    // ✅ Validar cuenta o tarjeta
    const ultimosCuenta = cuentaDestino.numeroCuenta?.slice(-4);
    const ultimosTarjeta = cuentaDestino.numeroTarjeta?.slice(-3);
    const cuentaValida = ultimosCuenta && textoExtraido.includes(ultimosCuenta);
    const tarjetaValida = ultimosTarjeta && textoExtraido.includes(ultimosTarjeta);
    if (!cuentaValida && !tarjetaValida) errores.push("No coincide con los últimos dígitos de la cuenta ni de la tarjeta.");

    // ✅ Banco
    const bancoValido = textoExtraido.includes(cuentaDestino.banco.toLowerCase());
    if (!bancoValido) errores.push("El banco no coincide.");

    // ✅ Titular
    const nombre = cuentaDestino.titular.toLowerCase().split(" ")[0];
    const titularValido = textoExtraido.includes(nombre);

    // ✅ Fecha
    fechaDetectada = extraerFecha(textoExtraido);
    let fechaValida = false;
    let mensajeFecha = "";

    if (fechaDetectada && fechaProgramada) {
      const fechaComprobante = new Date(fechaDetectada);
      const fechaPago = new Date(fechaProgramada);

      const inicioTolerancia = new Date(fechaPago);
      inicioTolerancia.setDate(fechaPago.getDate() - 4);

      if (fechaComprobante >= inicioTolerancia && fechaComprobante <= fechaPago) {
        fechaValida = true;
        mensajeFecha = "✅ Pagaste a tiempo.";
      }

      if (fechaComprobante > fechaPago) {
        const diasRetraso = Math.ceil((fechaComprobante - fechaPago) / (1000 * 60 * 60 * 24));
        const penalizacion = 80;
        const montoCorrecto = montoDetectado !== null && Math.abs(montoDetectado - montoEsperado) < 0.01;

        if (montoCorrecto) {
          fechaValida = true;
          conPenalizacion = true;
          mensajeFecha = `⚠️ Pagaste con penalización por ${diasRetraso} día(s) de retraso.`;
        } else {
          errores.push(`Pagaste ${diasRetraso} día(s) después, pero no se detecta el monto con penalización de $${penalizacion}.`);
        }
      }

      if (!fechaValida && mensajeFecha === "") {
        errores.push(`La fecha no es válida. Debes pagar entre el ${inicioTolerancia.toLocaleDateString("es-MX")} y el ${fechaPago.toLocaleDateString("es-MX")}, pero el comprobante muestra ${fechaDetectada || "N/A"}.`);
      }
    }

    // ✅ Validar monto final
    const montoValido = montoDetectado !== null && Math.abs(montoDetectado - montoEsperado) < 0.01;
    if (!montoValido) errores.push(`El monto no coincide. Deberías pagar $${montoEsperado.toFixed(2)}, pero el comprobante muestra $${montoDetectado?.toFixed(2) || "N/A"}.`);

    const validaciones = {
      montoValido,
      cuentaValida,
      tarjetaValida,
      bancoValido,
      fechaValida,
      titularValido,
      conPenalizacion
    };

    console.log("🔍 Validaciones:", validaciones);

    if (errores.length === 0) {
      return {
        estado: "Aprobado",
        conPenalizacion,
        mensaje: `✅ Pago validado correctamente por $${montoDetectado?.toFixed(2)} en la fecha ${fechaDetectada || "detectada"}. ${mensajeFecha}`,
      };
    }

    if (montoValido && (cuentaValida || tarjetaValida) && bancoValido && fechaValida) {
      return {
        estado: "Pendiente",
        conPenalizacion,
        mensaje: "⚠️ Pago pendiente de revisión. Observaciones: " + errores.join(" "),
      };
    }

    return {
      estado: "Rechazado",
      conPenalizacion,
      mensaje: "❌ Pago rechazado. Razones: " + errores.join(" "),
    };
  } catch (error) {
    console.error("❌ Error al procesar comprobante con OCR:", error);
    return {
      estado: "Pendiente",
      conPenalizacion: false,
      mensaje: "⚠️ Error al procesar el comprobante. Se requiere revisión manual.",
    };
  }
};

// Utilidad para extraer fecha del texto
function extraerFecha(texto) {
  const regexISO = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/; // formato clásico: 24/03/2025
  const matchISO = texto.match(regexISO);
  if (matchISO) return `${matchISO[3]}-${matchISO[2]}-${matchISO[1]}`;

  const regexTexto = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i;
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05",
    junio: "06", julio: "07", agosto: "08", septiembre: "09",
    octubre: "10", noviembre: "11", diciembre: "12"
  };

  const matchTexto = texto.match(regexTexto);
  if (matchTexto) {
    const dia = matchTexto[1].padStart(2, "0");
    const mes = meses[matchTexto[2].toLowerCase()];
    const anio = matchTexto[3];
    if (mes) return `${anio}-${mes}-${dia}`;
  }

  return null;
}

// 📌 REGISTRAR PAGO CON VALIDACIÓN Y PENALIZACIÓN

router.post("/", upload.single("comprobante"), async (req, res) => {
  try {
    const { userId, tandaId, monto } = req.body;
    const comprobanteUrl = req.file ? req.file.path : "";

    if (!userId || !tandaId || !monto) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // 🔍 Obtener cuenta destino
    const cuentaDestino = await CuentaDestino.findOne();
    if (!cuentaDestino) {
      return res.status(400).json({ message: "No hay cuenta destino registrada." });
    }

    // 🔍 Buscar la tanda y validar existencia
    const tanda = await Tanda.findById(tandaId);
    if (!tanda) return res.status(404).json({ message: "Tanda no encontrada." });

    const hoy = new Date();

    // 🧾 Obtener historial de pagos previos del usuario en esta tanda
    const historialPagos = await Pago.find({ userId, tandaId });

    // 🔍 Buscar próxima fecha pendiente que aún no haya sido pagada
    const fechasPendientes = tanda.fechasPago
      .filter(f =>
        f.userId.toString() === userId &&
        f.fechaPago &&
        !historialPagos.some(h =>
          h.fechaPago &&
          new Date(h.fechaPago).getTime() === new Date(f.fechaPago).getTime()
        )
      )
      .sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

    const proximaFechaPago = fechasPendientes[0]; // La más próxima aún no pagada

    if (!proximaFechaPago) {
      return res.status(400).json({ message: "Ya no tienes fechas pendientes de pago." });
    }

    // 🔴 Verificar si está atrasado (comparando la fecha con hoy)
    const estaAtrasado = new Date(proximaFechaPago.fechaPago) < hoy;
    const comision = estaAtrasado ? 80 : 0;
    const montoTotal = parseFloat(monto);

    // 🔎 Validar el comprobante con OCR usando la fecha correcta
    const resultadoOCR = await validarPagoAutomatico(
      comprobanteUrl,
      montoTotal,
      cuentaDestino,
      proximaFechaPago?.fechaPago
    );

    // 💾 Guardar el nuevo pago incluyendo la fecha exacta que le tocaba pagar
    const nuevoPago = new Pago({
      userId,
      tandaId,
      monto: montoTotal,
      comprobanteUrl,
      estado: resultadoOCR.estado,
      comision,
      atraso: estaAtrasado,
      fechaPago: proximaFechaPago.fechaPago, // ✅ Fecha programada
      mensajeOCR: resultadoOCR.mensaje,
      conPenalizacion: resultadoOCR.conPenalizacion // ✅ Nuevo campo
    });

    await nuevoPago.save();

    // Obtener información del usuario para el correo
    const usuario = await User.findById(userId);
    
    // Enviar notificación por correo
    await enviarNotificacionEstadoPago(usuario, nuevoPago, tanda);
    
    // Si el pago está atrasado, enviar notificación adicional
    if (nuevoPago.conPenalizacion) {
  await enviarNotificacionAtraso(usuario, nuevoPago, tanda);
}


    res.json({
      message: resultadoOCR.mensaje,
      pago: nuevoPago,
    });
  } catch (error) {
    console.error("❌ Error al registrar pago:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 OBTENER PAGOS DE UN USUARIO
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const pagos = await Pago.find({ userId }).populate("tandaId", "monto tipo");

    if (!pagos || pagos.length === 0) {
      return res.status(404).json({ message: "No se encontraron pagos para este usuario." });
    }

    res.json(pagos);
  } catch (error) {
    console.error("❌ Error al obtener pagos:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 OBTENER TODOS LOS PAGOS (para el panel de administración)
router.get("/", async (req, res) => {
  try {
    const pagos = await Pago.find()
      .populate("userId", "nombre correo") // ✅ Para que puedas mostrar nombre en el frontend
      .populate("tandaId", "monto tipo");

    res.json(pagos);
  } catch (error) {
    console.error("❌ Error al obtener todos los pagos:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Aprobar un pago manualmente
router.patch("/:pagoId/aprobar", async (req, res) => {
  try {
    const { pagoId } = req.params;
    const pago = await Pago.findByIdAndUpdate(
      pagoId,
      { estado: "Aprobado" },
      { new: true }
    );
    if (!pago) return res.status(404).json({ message: "Pago no encontrado." });

    res.json({ message: "Pago aprobado correctamente.", pago });
  } catch (error) {
    console.error("❌ Error al aprobar pago:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// 📌 Rechazar un pago manualmente
router.patch("/:pagoId/rechazar", async (req, res) => {
  try {
    const { pagoId } = req.params;
    const pago = await Pago.findByIdAndUpdate(
      pagoId,
      { estado: "Rechazado" },
      { new: true }
    );
    if (!pago) return res.status(404).json({ message: "Pago no encontrado." });

    res.json({ message: "Pago rechazado correctamente.", pago });
  } catch (error) {
    console.error("❌ Error al rechazar pago:", error);
    res.status(500).json({ message: "Error en el servidor", error });
  }
});

// ✅ Ruta corregida: obtiene la próxima fecha de pago usando userId manual (Wear OS)
router.get('/proxima-fecha', async (req, res) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(400).json({ message: 'Falta userId' });
  }

  try {
    // Busca todas las tandas donde el userId esté en fechasPago
    const tandas = await Tanda.find({ 'fechasPago.userId': userId });

    let fechasPendientes = [];
    tandas.forEach(tanda => {
      const pendientes = tanda.fechasPago.filter(f =>
        f.userId.toString() === userId && f.fechaPago
      );
      fechasPendientes.push(...pendientes);
    });

    // Excluir pagos ya realizados
    const historialPagos = await Pago.find({ userId });
    fechasPendientes = fechasPendientes.filter(f =>
      !historialPagos.some(h =>
        h.fechaPago &&
        new Date(h.fechaPago).getTime() === new Date(f.fechaPago).getTime()
      )
    );

    fechasPendientes.sort((a, b) => new Date(a.fechaPago) - new Date(b.fechaPago));

    if (fechasPendientes.length === 0) {
      return res.status(404).json({ message: 'No hay fechas pendientes.' });
    }

    res.json({ proximaFechaPago: fechasPendientes[0].fechaPago });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al buscar próxima fecha de pago' });
  }
});

module.exports = router;
