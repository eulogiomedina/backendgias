const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const MongoStore = require('connect-mongo');
const protectedRoutes = require('./routes/protectedRoutes');
const validateRoutes = require('./routes/validate');
const phoneRoutes = require('./routes/validatePhone');
const cupomexRoutes = require('./routes/cupomex');
const blockedAccountsRoutes = require('./routes/blockedAccounts');

dotenv.config();

const app = express();

// Habilitar CORS
const corsOptions = {
  origin: 'http://localhost:3000', // URL de tu frontend
  credentials: true, // Para permitir cookies, si es necesario
};
app.use(cors(corsOptions));

// Middleware para parsear JSON
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.log(err));

// Configurar sesiones seguras
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000 // 30 minutos
  },
  genid: function(req) {
    return crypto.randomBytes(32).toString('hex'); // Generar un ID de sesión único
  }
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

// Usar las rutas
app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);
app.use('/api/policies', policyRoute);
app.use('/api/terms', termsRoute);
app.use('/api/password', passwordResetRoutes);
app.use('/api/contact', contactRoute);
// Rutas protegidas
app.use('/api', protectedRoutes);
app.use('/api/audit', auditRoute);
// Rutas de restablecimiento de contraseña
app.use('/api/social-links', socialLinksRoutes);
app.use('/api/legal-boundaries', legalBoundaryRoute);
app.use('/api/slogan', sloganRoutes);
app.use('/api/logo', logoRoutes);
app.use('/api', validateRoutes);
app.use('/api', phoneRoutes);
app.use('/api/cupomex', cupomexRoutes);
app.use('/api/accounts', blockedAccountsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/acc', accountRoutes);
app.use("/api/nuevos-ahorros", nuevosAhorrosRoutes);
app.use("/api/ahorros-usuarios", ahorrosUsuariosRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/tandas", tandasRoutes);
app.use("/api/pagos", pagosRoutes);
app.use('/api', estadoRoutes);
app.use("/api/cuenta-destino", cuentaDestinoRoutes);

// Ruta para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

// Ruta para cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('No se pudo cerrar la sesión');
    }
    res.clearCookie('connect.sid');
    res.status(200).send('Sesión cerrada correctamente');
  });
});

// Middleware para manejar errores globales
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({ errorCode: statusCode });
});

// Middleware para manejar errores 404
app.use((req, res) => {
  res.status(404).json({ errorCode: 404 });
});

// Escuchar en el puerto configurado
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
