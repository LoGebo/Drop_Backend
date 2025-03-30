const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocketServer } = require('./sockets/socketManager');
const { connectRedis } = require('./config/redis');
const apiRoutes = require('./routes');
require('dotenv').config();

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Configurar rutas de API
app.use('/api', apiRoutes);

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
      trips: {
        planTrip: 'POST /api/trips/plan'
      }
    }
  });
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
}); 