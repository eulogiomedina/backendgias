const mongoose = require('mongoose');

// Esquema para el registro de inicios de sesión
const loginSchema = new mongoose.Schema({
  nombreCompleto: { type: String, required: true },  // Campo para almacenar el nombre completo
  correo: { type: String, required: true },           // Correo del usuario
  fechaHora: { type: Date, default: Date.now }       // Fecha y hora del inicio de sesión
});

// Modelo para el registro de inicios de sesión
const LoginAudit = mongoose.model('LoginAudit', loginSchema);

// Esquema para el registro de cambios de contraseña
const passwordChangeSchema = new mongoose.Schema({
  nombreCompleto: { type: String, required: true },   // Campo para almacenar el nombre completo
  correo: { type: String, required: true },            // Correo del usuario
  contraseñaAnterior: { type: String, required: true }, // Contraseña anterior (no recomendable en texto plano)
  nuevaContraseña: { type: String, required: true },  // Nueva contraseña (no recomendable en texto plano)
  fechaHora: { type: Date, default: Date.now }        // Fecha y hora del cambio de contraseña
});

// Modelo para el registro de cambios de contraseña
const PasswordChangeAudit = mongoose.model('PasswordChangeAudit', passwordChangeSchema);

// Exportar ambos modelos
module.exports = { LoginAudit, PasswordChangeAudit };
