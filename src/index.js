const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocketServer } = require('./sockets/socketManager');
const { connectRedis } = require('./config/redis');
const apiRoutes = require('./routes');
const tripPlannerRoutes = require('./routes/tripPlanner');
const metroData = require('./data/metroRoutes');
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

// Simulador simple de vagones de metro en memoria
let metroVehicles = [];
let vehicleIdCounter = 1;

// Endpoint directo para acceder a datos de estaciones del metro (para resolver el error)
app.get('/api/metro/stations/:lineId', (req, res) => {
  const { lineId } = req.params;
  
  if (lineId !== 'L1' && lineId !== 'L2') {
    return res.status(404).json({ 
      success: false, 
      message: 'Línea de metro no encontrada' 
    });
  }
  
  const stations = lineId === 'L1' ? metroData.metroLinea1Stations : metroData.metroLinea2Stations;
  
  // Convertir el objeto de estaciones a un array
  const stationsArray = Object.entries(stations).map(([name, data]) => ({
    name,
    index: data.index,
    coordinates: data.coordinates
  }));
  
  // Ordenar por índice
  stationsArray.sort((a, b) => a.index - b.index);
  
  res.json({
    success: true,
    data: stationsArray
  });
});

// Endpoint para obtener todos los vagones
app.get('/api/metro/vehicles', (req, res) => {
  res.json({
    success: true,
    data: metroVehicles
  });
});

// Endpoint para obtener un vagón específico
app.get('/api/metro/vehicles/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  const vehicle = metroVehicles.find(v => v.id === vehicleId);
  
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: `Vagón con ID ${vehicleId} no encontrado`
    });
  }
  
  res.json({
    success: true,
    data: vehicle
  });
});

// Endpoint para añadir un vagón entre estaciones
app.post('/api/metro/vehicles/add-between-stations', (req, res) => {
  const { vehicleId, lineId, startStation, endStation, speed, directionForward = true } = req.body;
  
  // Validar datos
  if (!lineId || !startStation || !endStation || !speed) {
    return res.status(400).json({
      success: false,
      message: 'Datos incompletos. Se requiere lineId, startStation, endStation y speed.'
    });
  }
  
  if (isNaN(parseFloat(speed)) || parseFloat(speed) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'La velocidad debe ser un número positivo.'
    });
  }
  
  const line = lineId === 'L2' ? 'METRO_L2' : 'METRO_L1';
  const stations = lineId === 'L2' ? metroData.metroLinea2Stations : metroData.metroLinea1Stations;
  
  // Verificar que las estaciones existan
  if (!stations[startStation] || !stations[endStation]) {
    return res.status(404).json({
      success: false,
      message: 'Una o ambas estaciones no existen en la línea especificada.'
    });
  }
  
  // Obtener el segmento de ruta entre las estaciones
  const routeSegment = metroData.findRouteSegment(line, startStation, endStation);
  
  if (!routeSegment || routeSegment.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No se pudo encontrar un segmento de ruta entre las estaciones especificadas.'
    });
  }
  
  // Generar ID para el vagón si no se proporciona
  const newVehicleId = vehicleId || `metro_${lineId}_${vehicleIdCounter++}`;
  
  // Crear nuevo vagón
  const newVehicle = {
    id: newVehicleId,
    lineId,
    currentPosition: { ...routeSegment[0] }, // Posición inicial (primera estación)
    startStation,
    endStation,
    speed: parseFloat(speed),
    status: 'ACTIVE',
    directionForward,
    route: routeSegment,
    routeProgress: 0, // Progreso en el segmento actual (0-1)
    segmentIndex: 0, // Índice del segmento actual en la ruta
    capacity: Math.floor(Math.random() * 120) + 30, // Capacidad aleatoria entre 30 y 150 personas
    currentOccupancy: Math.floor(Math.random() * 100) + 20, // Ocupación actual entre 20 y 120 personas
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Añadir vagón a la lista
  metroVehicles.push(newVehicle);
  
  // Iniciar simulación de movimiento para este vagón
  simulateVehicleMovement(newVehicleId);
  
  res.status(201).json({
    success: true,
    data: newVehicle
  });
});

// Endpoint para detener un vagón
app.put('/api/metro/vehicles/:vehicleId/stop', (req, res) => {
  const { vehicleId } = req.params;
  const vehicleIndex = metroVehicles.findIndex(v => v.id === vehicleId);
  
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Vagón no encontrado.'
    });
  }
  
  // Actualizar estado
  metroVehicles[vehicleIndex].status = 'STOPPED';
  metroVehicles[vehicleIndex].updatedAt = new Date();
  
  res.json({
    success: true,
    data: metroVehicles[vehicleIndex]
  });
});

// Endpoint para reanudar un vagón
app.put('/api/metro/vehicles/:vehicleId/resume', (req, res) => {
  const { vehicleId } = req.params;
  const vehicleIndex = metroVehicles.findIndex(v => v.id === vehicleId);
  
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Vagón no encontrado.'
    });
  }
  
  // Actualizar estado
  metroVehicles[vehicleIndex].status = 'ACTIVE';
  metroVehicles[vehicleIndex].updatedAt = new Date();
  
  res.json({
    success: true,
    data: metroVehicles[vehicleIndex]
  });
});

// Endpoint para eliminar un vagón
app.delete('/api/metro/vehicles/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  const vehicleIndex = metroVehicles.findIndex(v => v.id === vehicleId);
  
  if (vehicleIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Vagón no encontrado.'
    });
  }
  
  // Eliminar vagón
  const removedVehicle = metroVehicles.splice(vehicleIndex, 1)[0];
  
  res.json({
    success: true,
    data: removedVehicle
  });
});

// Función para simular el movimiento del vagón
function simulateVehicleMovement(vehicleId) {
  const updateInterval = setInterval(() => {
    const vehicleIndex = metroVehicles.findIndex(v => v.id === vehicleId);
    
    // Si el vagón no existe más, detener la simulación
    if (vehicleIndex === -1) {
      clearInterval(updateInterval);
      return;
    }
    
    const vehicle = metroVehicles[vehicleIndex];
    
    // Si el vagón está detenido, no actualizar posición
    if (vehicle.status !== 'ACTIVE') return;
    
    // Tiempo transcurrido desde la última actualización en segundos
    const now = new Date();
    const timeDiff = (now - new Date(vehicle.updatedAt)) / 1000;
    
    // Convertir velocidad de km/h a metros/segundo
    const speedMps = vehicle.speed * (1000 / 3600);
    
    // Distancia recorrida en este intervalo
    const distanceTraveled = speedMps * timeDiff;
    
    // Actualizar posición según la ruta
    if (vehicle.route && vehicle.route.length > 1) {
      // Obtener segmento actual
      const currentSegment = vehicle.segmentIndex;
      const segmentStart = vehicle.route[currentSegment];
      const segmentEnd = vehicle.route[currentSegment + 1];
      
      if (segmentStart && segmentEnd) {
        // Calcular distancia total del segmento
        const segmentDistance = calculateDistance(
          segmentStart.latitude, segmentStart.longitude,
          segmentEnd.latitude, segmentEnd.longitude
        );
        
        // Actualizar progreso en el segmento
        vehicle.routeProgress += distanceTraveled / segmentDistance;
        
        // Si completamos el segmento actual, pasar al siguiente
        if (vehicle.routeProgress >= 1) {
          // Calcular progreso excedente
          const excessProgress = vehicle.routeProgress - 1;
          
          // Pasar al siguiente segmento
          vehicle.segmentIndex++;
          vehicle.routeProgress = 0;
          
          // Si llegamos al final de la ruta
          if (vehicle.segmentIndex >= vehicle.route.length - 1) {
            // Reiniciar a la posición inicial o cambiar dirección
            if (vehicle.directionForward) {
              vehicle.segmentIndex = 0;
            } else {
              vehicle.segmentIndex = vehicle.route.length - 2;
              vehicle.directionForward = !vehicle.directionForward;
            }
          }
          
          // Aplicar progreso excedente al nuevo segmento
          const nextSegmentStart = vehicle.route[vehicle.segmentIndex];
          const nextSegmentEnd = vehicle.route[vehicle.segmentIndex + 1];
          
          if (nextSegmentStart && nextSegmentEnd) {
            const nextSegmentDistance = calculateDistance(
              nextSegmentStart.latitude, nextSegmentStart.longitude,
              nextSegmentEnd.latitude, nextSegmentEnd.longitude
            );
            
            vehicle.routeProgress = excessProgress * segmentDistance / nextSegmentDistance;
          }
          
          // Simular cambio en la ocupación al llegar a una nueva estación
          simulateOccupancyChange(vehicle);
        }
        
        // Interpolar posición actual en el segmento
        const newPosition = interpolatePosition(
          segmentStart.latitude, segmentStart.longitude,
          segmentEnd.latitude, segmentEnd.longitude,
          vehicle.routeProgress
        );
        
        vehicle.currentPosition = newPosition;
        
        // Encontrar estación más cercana
        const nearestStation = metroData.findNearestStation(
          newPosition.latitude,
          newPosition.longitude,
          vehicle.lineId === 'L2' ? 'METRO_L2' : 'METRO_L1'
        );
        
        if (nearestStation) {
          vehicle.nearestStation = nearestStation.name;
        }
      }
    }
    
    // Actualizar timestamp
    vehicle.updatedAt = now;
  }, 1000); // Actualizar cada segundo
}

// Función para simular cambios en la ocupación del vagón
function simulateOccupancyChange(vehicle) {
  // Personas que se bajan (entre 5 y 20)
  const peopleLeaving = Math.floor(Math.random() * 15) + 5;
  
  // Personas que suben (entre 5 y 25)
  const peopleBoarding = Math.floor(Math.random() * 20) + 5;
  
  // Actualizar ocupación con límites
  vehicle.currentOccupancy = Math.max(0, vehicle.currentOccupancy - peopleLeaving);
  vehicle.currentOccupancy = Math.min(vehicle.capacity, vehicle.currentOccupancy + peopleBoarding);
  
  console.log(`[${vehicle.id}] Estación ${vehicle.nearestStation}: ${peopleLeaving} personas bajan, ${peopleBoarding} suben. Ocupación actual: ${vehicle.currentOccupancy}/${vehicle.capacity}`);
}

// Calcular distancia entre dos puntos (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Convertir a metros
}

// Interpolar posición entre dos puntos
function interpolatePosition(lat1, lon1, lat2, lon2, progress) {
  return {
    latitude: lat1 + (lat2 - lat1) * progress,
    longitude: lon1 + (lon2 - lon1) * progress
  };
}

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
      },
      metro: {
        stations: 'GET /api/metro/stations/:lineId',
        vehicles: 'GET /api/metro/vehicles',
        vehicleById: 'GET /api/metro/vehicles/:vehicleId',
        addVehicle: 'POST /api/metro/vehicles/add-between-stations',
        stopVehicle: 'PUT /api/metro/vehicles/:vehicleId/stop',
        resumeVehicle: 'PUT /api/metro/vehicles/:vehicleId/resume',
        deleteVehicle: 'DELETE /api/metro/vehicles/:vehicleId'
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