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

// ————— Configuración base —————
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors({
  origin: 'https://forntendgias.vercel.app',
  credentials: true,
}));

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

// ————— Importar rutas de tu API normal —————
const usersRoute           = require('./routes/users');
const authRoute            = require('./routes/auth');
const policyRoute          = require('./routes/policyRoutes');
const termsRoute           = require('./routes/terms');
const passwordResetRoutes  = require('./routes/passwordReset');
const auditRoute           = require('./routes/audit');
const contactRoute         = require('./routes/contact');
const socialLinksRoutes    = require('./routes/socialLinks');
const legalBoundaryRoute   = require('./routes/legalBoundaryRoutes');
const sloganRoutes         = require('./routes/SloganRoutes');
const logoRoutes           = require('./routes/logoRoutes');
const chatbotRoutes        = require('./routes/chatbot');
const accountRoutes        = require('./routes/accountRoutes');
const nuevosAhorrosRoutes  = require('./routes/nuevosAhorros');
const ahorrosUsuariosRoutes= require('./routes/ahorrosUsuarios');
const perfilRoutes         = require('./routes/perfil');
const tandasRoutes         = require('./routes/tandas');
const pagosRoutes          = require('./routes/pagos');
const estadoRoutes         = require('./routes/estados');
const cuentaDestinoRoutes  = require('./routes/cuentaDestino');
const wearosRoutes         = require('./routes/wearos');

// ————— Importar rutas específicas de Alexa —————
const alexaRoutes = require('./routes/alexa');

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
app.use('/api/accounts', accountRoutes);
app.use('/api/nuevos-ahorros', nuevosAhorrosRoutes);
app.use('/api/ahorros-usuarios', ahorrosUsuariosRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/tandas', tandasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/estados', estadoRoutes);
app.use('/api/cuenta-destino', cuentaDestinoRoutes);
app.use('/api/wearos', wearosRoutes);

// **NUEVO**: todas las rutas de Alexa quedan centralizadas bajo `/api/alexa`
app.use('/api/alexa', alexaRoutes);

// Ruta raíz y gestión de 404 / errores
app.get('/', (req, res) => res.send('¡Servidor funcionando!'));

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
