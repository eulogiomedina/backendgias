const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Definición del esquema del usuario
const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellidos: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  telefono: { type: String, required: true },
  direccion: {
    ciudad: { type: String, required: true },
    colonia: { type: String, required: true },
    calle: { type: String, required: true }
  },
  loginAttempts: { type: Number, default: 0 }, // Intentos fallidos de inicio de sesión
  lockUntil: { type: Date }, // Tiempo hasta que la cuenta se desbloquee
  isVerified: { type: Boolean, default: false },  // Estado de verificación de correo
  verificationToken: { type: String },  // Token de verificación de correo
  verificationTokenExpires: { type: Date },  // Fecha de expiración del token de verificación
  role: { type: String, enum: ['user', 'admin'], default: 'user' },  // Roles: 'user' o 'admin'
  resetPasswordToken: { type: String },  // Token para restablecer la contraseña
  resetPasswordExpires: { type: Date }  // Expiración del token de restablecimiento de contraseña
});

// Máximo de intentos fallidos y tiempo de bloqueo
const MAX_ATTEMPTS = 5; 
const LOCK_TIME = 2 * 60 * 1000; // 2 minutos de bloqueo

// Cifrar la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // Solo cifrar si la contraseña ha sido modificada
  console.log('Modificando contraseña antes de guardar'); // Mensaje para debug
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt); // Hashear la nueva contraseña
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


const User = mongoose.model('User', userSchema);
module.exports = User;
