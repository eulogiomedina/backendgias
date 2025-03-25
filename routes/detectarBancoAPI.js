const axios = require("axios");
const BinBanco = require("../models/BinBanco");

function limpiarNombreBanco(nombre) {
  if (!nombre) return null;

  const limpio = nombre
    .replace(/S\.?A\.?/gi, "")
    .replace(/Instituci[oó]n de Banca M[uú]ltiple/gi, "")
    .replace(/Sociedad An[oó]nima/gi, "")
    .replace(/S\.? de R\.?L\.?/gi, "")
    .replace(/,/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return limpio
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function detectarBancoPorBIN(numeroTarjeta) {
  const bin = String(numeroTarjeta || "").replace(/\D/g, "").substring(0, 6);
  if (bin.length !== 6) return null;

  // Buscar en la base de datos primero
  const binExistente = await BinBanco.findOne({ bin });
  if (binExistente) return binExistente.banco;

  try {
    const response = await axios.get(`https://lookup.binlist.net/${bin}`, {
      headers: {
        "User-Agent": "gias-webapp/1.0 (https://gias-app.local)",
      },
    });

    let banco = response.data?.bank?.name || null;
    banco = limpiarNombreBanco(banco);

    await BinBanco.create({ bin, banco });

    return banco;
  } catch (error) {
    console.error("❌ Error al consultar BINLIST:", error.message);
    return null;
  }
}

module.exports = detectarBancoPorBIN;
