const mongoose = require('mongoose');

const solicitudPrestamoSchema = new mongoose.Schema({
  nombre_completo: { type: String, required: true },
  ingreso_mensual_aprox: { type: Number, required: true },
  egresos_mensuales_aprox: { type: Number, required: true },
  tiene_ingreso_fijo: { type: Number, required: true },
  ocupacion: { type: String, enum: ['Empleado', 'Negocio propio', 'Freelance', 'Otro'], required: true },
  frecuencia_de_ingresos: { type: String, enum: ['Semanal', 'Quincenal', 'Mensual'], required: true },
  cuenta_con_ahorros: { type: Number, required: true },
  ahorra_mensualmente: { type: Number, required: true },
  monto_ahorro_mensual: { type: Number, required: true },
  tiene_dependientes: { type: Number, required: true },
  cuantos_dependientes: { type: Number, min: 0, max: 10, required: true },
  nivel_compromiso_financiero: { type: Number, min: 1, max: 6, required: true },
  usa_apps_financieras: { type: Number, required: true },
  educacion_financiera: { type: Number, min: 1, max: 6, required: true },
  ha_participado_en_ahorros: { type: Number, required: true },
  puntual_en_ahorros_previos: { type: Number, enum: [0, 1, 2], required: true }, // <--- CAMBIO AQUÍ
  razon_para_ahorrar: { type: String, enum: ['Emergencia', 'Meta', 'Inversión', 'Otro'], required: true },
  numero_telefonico: { type: String, required: true },
  status: { type: String, enum: ['pendiente', 'evaluado'], default: 'pendiente' },
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('SolicitudPrestamo', solicitudPrestamoSchema);
