const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocketServer } = require('./sockets/socketManager');
const { connectRedis } = require('./config/redis');
const apiRoutes = require('./routes');
const tripPlannerRoutes = require('./routes/tripPlanner');
require('dotenv').config();

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de logs para depuración
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configuración CORS más permisiva para desarrollo local
app.use(cors({
  origin: '*', // Permitir cualquier origen durante desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Middleware para procesar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Configurar rutas de API
app.use('/api', apiRoutes);
app.use('/api/trip-planner', tripPlannerRoutes);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Endpoint de documentación (para referencia rápida)
app.get('/api-docs', (req, res) => {
  res.status(200).json({
    message: 'API RESTful para el seguimiento de vehículos de transporte',
    endpoints: {
      vehicles: {
        getAll: 'GET /api/vehicles',
        getById: 'GET /api/vehicles/:vehicleId',
        getByType: 'GET /api/vehicles/type/:vehicleType',
        getByRoute: 'GET /api/vehicles/route/:routeId',
        updateLocation: 'POST /api/vehicles/:vehicleId/location'
      },
      routes: {
        getAll: 'GET /api/routes',
        getById: 'GET /api/routes/:routeId',
        getVehicles: 'GET /api/routes/:routeId/vehicles',
        create: 'POST /api/routes',
        suggest: 'POST /api/routes/suggest'
      },
      tripPlanner: {
        plan: 'POST /api/trip-planner',
        nearbyStops: 'GET /api/trip-planner/nearby-stops'
      }
    }
  });
});

// Ruta para probar la conexión al servidor
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Conexión exitosa al servidor' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Recurso no encontrado', message: 'La ruta solicitada no existe' });
});

// Crear el servidor HTTP
const server = http.createServer(app);

// Iniciar el servidor Socket.io
initSocketServer(server);

// Conectar a Redis
connectRedis();

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`Public directory: ${path.join(__dirname, '../public')}`);
  console.log(`Test connection at http://localhost:${PORT}/test`);
}); 