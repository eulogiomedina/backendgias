const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const BlockedAccount = require('./BlockedAccount'); // Importar el modelo de cuentas bloqueadas

// Definición del esquema del usuario
const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwords_ant: [{ type: String, default: [] }], // Historial de contraseñas anteriores (hashed)
  telefono: { type: String, required: true },
  direccion: {
    estado: { type: String, required: true },
    municipio: { type: String, required: true },
    colonia: { type: String, required: true },
  },
  loginAttempts: { type: Number, default: 0 }, // Intentos fallidos de inicio de sesión
  lockUntil: { type: Date }, // Tiempo hasta que la cuenta se desbloquee
  isVerified: { type: Boolean, default: false }, // Estado de verificación de correo
  verificationToken: { type: String }, // Token de verificación de correo
  verificationTokenExpires: { type: Date }, // Fecha de expiración del token de verificación
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Roles: 'user' o 'admin'
  resetPasswordToken: { type: String }, // Token para restablecer la contraseña
  resetPasswordExpires: { type: Date }, // Expiración del token de restablecimiento de contraseña
});

// Máximo de intentos fallidos y tiempo de bloqueo
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 1000; // 2 minutos de bloqueo

// Middleware para cifrar la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Solo cifrar si la contraseña ha sido modificada

  console.log('Preparando para cifrar la nueva contraseña');

  // Inicializar passwords_ant si no existe
  if (!this.passwords_ant) {
    this.passwords_ant = [];
  }

  // Agregar la contraseña actual al historial si no es una nueva cuenta
  if (!this.isNew && this.password) {
    if (this.passwords_ant.length >= 5) {
      this.passwords_ant.shift(); // Mantener solo las últimas 5 contraseñas
    }
    this.passwords_ant.push(this.password); // Agregar la contraseña actual al historial
  }

  // Cifrar la nueva contraseña
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  console.log('Nueva contraseña cifrada con éxito');
  next();
});

// Método para generar un nuevo token de verificación
userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // Validez de 24 horas
  return token;
};

// Método para verificar si el usuario está bloqueado
userSchema.virtual('isLocked').get(function () {
  // Si lockUntil está definido y es mayor que la hora actual, la cuenta está bloqueada
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Método para incrementar los intentos fallidos de inicio de sesión
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Si el tiempo de bloqueo ha pasado, restablecer los intentos
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    // Incrementar el número de intentos fallidos
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX_ATTEMPTS) {
      // Bloquear la cuenta si se alcanzó el máximo de intentos fallidos
      this.lockUntil = Date.now() + LOCK_TIME;

      // Registrar en la colección de cuentas bloqueadas
      try {
        await BlockedAccount.create({ correo: this.correo });
        console.log(`Cuenta bloqueada registrada para el correo: ${this.correo}`);
      } catch (error) {
        console.error('Error al registrar la cuenta bloqueada:', error);
      }
    }
  }
  await this.save();
};

// Método para restablecer los intentos de inicio de sesión después de un intento exitoso
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// Método para comparar la contraseña ingresada con la contraseña hasheada
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password); // Retorna true o false
};

// Método para verificar si la nueva contraseña ya ha sido utilizada
userSchema.methods.isPasswordUsed = async function (newPassword) {
  if (!this.passwords_ant) return false; // Si no hay historial, no hay conflicto

  // Comprobar si la contraseña está en el historial
  const isUsed = await Promise.all(
    this.passwords_ant.map(async (oldPasswordHash) => {
      return bcrypt.compare(newPassword, oldPasswordHash);
    })
  );

  return isUsed.includes(true);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
