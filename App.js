// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const MongoStore = require('connect-mongo');
const path = require('path');

dotenv.config();
const app = express();
 
// Habilitar CORS
const corsOptions = {
  origin: 'http://localhost:3000', //  https://forntendgias.vercel.app----http://localhost:3000
  credentials: true, // Para permitir cookies, si es necesario
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error(err));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000,
  },
  genid: () => crypto.randomBytes(32).toString('hex'),
}));

// Importar rutas
const usersRoute = require('./routes/users');
const authRoute = require('./routes/auth');
const policyRoute = require('./routes/policyRoutes');  // Rutas de políticas
const termsRoute = require('./routes/terms');
const passwordResetRoutes = require('./routes/passwordReset');
const auditRoute = require('./routes/audit'); // Rutas de auditoría
const contactRoute = require('./routes/contact');
const socialLinksRoutes = require('./routes/socialLinks');
const legalBoundaryRoute = require('./routes/legalBoundaryRoutes');
const sloganRoutes = require('./routes/SloganRoutes');
const logoRoutes = require('./routes/logoRoutes'); // Ruta de logo
const chatbotRoutes = require('./routes/chatbot');
const accountRoutes = require('./routes/accountRoutes');
const nuevosAhorrosRoutes = require("./routes/nuevosAhorros");
const ahorrosUsuariosRoutes = require("./routes/ahorrosUsuarios");
const perfilRoutes = require('./routes/perfil');
const tandasRoutes = require("./routes/tandas");
const pagosRoutes = require("./routes/pagos");
const estadoRoutes = require('./routes/estados');
const cuentaDestinoRoutes = require("./routes/cuentaDestino");
const notificacionesRouter = require('./routes/notificaciones');
const openpayRoutes = require('./routes/openpayRoutes');
const mercadopagoRoutes = require('./routes/mercadopago');
const wearosRoutes         = require('./routes/wearos');

// ————— Importar rutas específicas de Alexa —————
const alexaAuthRoutes = require('./routes/alexa'); 
const solicitudesPrestamoRoutes = require('./routes/solicitudesPrestamo');
// Rutas de validación
const emailRoutes = require('./routes/validate');       // aquí está validate-email
const phoneRoutes = require('./routes/validatePhone');  // aquí está validate-phone
const cupomexRoutes = require('./routes/cupomex');      // estados/municipios/colonias
const googleAuthRoute = require('./routes/googleAuth');
const resetMobileRoutes = require("./routes/resetMobile");


// ————— Montaje de rutas —————
app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);
app.use('/api/policies', policyRoute);
app.use('/api/terms', termsRoute);
app.use('/api/password', passwordResetRoutes);
app.use('/api/contact', contactRoute);
app.use('/api/audit', auditRoute);
app.use('/api/social-links', socialLinksRoutes);
app.use('/api/legal-boundaries', legalBoundaryRoute);
app.use('/api/slogan', sloganRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/acc', accountRoutes);
app.use("/api/nuevos-ahorros", nuevosAhorrosRoutes);
app.use("/api/ahorros-usuarios", ahorrosUsuariosRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/tandas", tandasRoutes);
app.use("/api/pagos", pagosRoutes);
app.use('/api', estadoRoutes);
app.use("/api/cuenta-destino", cuentaDestinoRoutes);
app.use('/api/notificaciones', notificacionesRouter);
app.use('/api/openpay', openpayRoutes); 
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/wearos', wearosRoutes);
app.use('/api/solicitudes-prestamo', solicitudesPrestamoRoutes);
app.use('/api', emailRoutes);       // -> /api/validate-email
app.use('/api', phoneRoutes);       // -> /api/validate-phone
app.use('/api/cupomex', cupomexRoutes); // -> /api/cupomex/estados, /api/cupomex/municipios, /api/cupomex/colonias
app.use('/api/google', googleAuthRoute);
app.use("/api/reset-mobile", resetMobileRoutes);




// **NUEVO**: todas las rutas de Alexa quedan centralizadas bajo `/api/alexa`
app.use('/api/alexa', alexaAuthRoutes);
// Ruta para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('No se pudo cerrar la sesión');
    res.clearCookie('connect.sid');
    res.sendStatus(200);
  });
});

app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err.stack);
  res.status(err.status || 500).json({ errorCode: err.status || 500 });
});

app.use((req, res) => res.status(404).json({ errorCode: 404 }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
