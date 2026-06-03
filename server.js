/* =============================================
   SERVER.JS - Servidor Principal
   Plataforma Odontológica OdontoUNERG
   Arquitectura MVC con Node.js y Express
   Universidad Nacional Experimental Rómulo Gallegos
   ============================================= */

// Importar dependencias
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const requestRoutes = require('./routes/requestRoutes');
const chatRoutes = require('./routes/chatRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const profileRoutes = require('./routes/profileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ratingRoutes = require('./routes/ratingRoutes');

// Inicializar la aplicación Express
const app = express();

// Puerto del servidor
const PORT = process.env.PORT || 3000;

/* =============================================
   MIDDLEWARES
   ============================================= */

// Habilitar CORS para solicitudes externas
app.use(cors());

// Parsear cuerpos JSON en las solicitudes
app.use(express.json());

// Parsear datos URL-encoded de formularios
app.use(express.urlencoded({ extended: true }));

/* =============================================
   ARCHIVOS ESTÁTICOS
   Servir CSS, JavaScript, imágenes y assets
   ============================================= */
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

/* =============================================
   RUTAS DE VISTAS (HTML)
   Servir las páginas principales del sistema
   ============================================= */

// Página de inicio (landing page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Registro de estudiante
app.get('/registro-estudiante', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registro-estudiante.html'));
});

// Registro de paciente
app.get('/registro-paciente', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registro-paciente.html'));
});

// Recuperar contraseña
app.get('/recuperar-clave', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'recuperar-clave.html'));
});

// Dashboard del estudiante
app.get('/dashboard-estudiante', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard-estudiante.html'));
});

// Dashboard del paciente
app.get('/dashboard-paciente', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard-paciente.html'));
});

// Dashboard del administrador
app.get('/dashboard-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard-admin.html'));
});

/* =============================================
   RUTAS DE API
   Endpoints del backend organizados por módulo
   ============================================= */
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ratings', ratingRoutes);


/* =============================================
   MANEJO DE ERRORES
   Página 404 para rutas no encontradas
   ============================================= */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

/* =============================================
   INICIAR SERVIDOR
   ============================================= */
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  OdontoUNERG - Servidor Iniciado`);
  console.log(`  Puerto: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
  console.log(`========================================\n`);
});
